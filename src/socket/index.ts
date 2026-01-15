import { Server } from "socket.io";
import { redisClient } from "../config/redis";
import Message from "../models/Message";
import User from "../models/User";
import Conversation from "../models/Conversation";

export function registerSocketHandlers(io: Server) {
  {
    io.on("connection", (socket) => {
      console.log(`🔌 User connected: ${socket.id}`);

      // Handle user authentication/login (no room joining needed)
      socket.on(
        "authenticate",
        async (data: { username: string; userId?: string }) => {
          try {
            const user = {
              id: socket.id,
              username: data.username,
              userId: data.userId,
              socketId: socket.id,
              isOnline: true,
              lastSeen: new Date().toISOString(),
            };

            // Store user in Redis with their socket ID
            await redisClient.hSet(
              "connectedUsers",
              socket.id,
              JSON.stringify(user)
            );
            // If userId is provided, also store by userId for easy lookup
            if (data.userId) {
              await redisClient.hSet("userSockets", data.userId, socket.id);
            }
            // Update user online status in database if userId is provided
            if (data.userId) {
              await User.findByIdAndUpdate(data.userId, {
                isOnline: true,
                lastSeen: new Date(),
              });
            }

            // Get all online users for the client
            // const usersObj = await redisClient.hGetAll("connectedUsers");
            // const onlineUsers = Object.values(usersObj)
            //   .map((str) => JSON.parse(str))
            //   .map((u) => ({
            //     id: u.userId || u.id,
            //     username: u.username,
            //     isOnline: true,
            //     socketId: u.socketId,
            //   }));

            // Send online users list to the authenticated user
            socket.emit("authenticated", {
              user: { id: data.userId || socket.id, username: data.username },
            });

            // Notify all other users that this user is online
            socket.broadcast.emit("userOnline", {
              id: data.userId || socket.id,
              username: data.username,
              isOnline: true,
            });

            console.log(
              `✅ ${data.username} authenticated (${
                data.userId || "no userId"
              })`
            );
          } catch (error) {
            console.error("Error in authenticate event:", error);
            socket.emit("error", { message: "Failed to authenticate" });
          }
        }
      );

      // Handle direct messages (Messenger-style)
      // socket.on(
      //   "sendDirectMessage",
      //   async (data: {
      //     recipientId: string;
      //     message: string;
      //     conversationId?: string;
      //     messageType?: string;
      //     userId?: string;
      //   }) => {
      //     try {
      //       const userStr = await redisClient.hGet("connectedUsers", socket.id);
      //       console.log("connected user", userStr);
      //       const user = userStr ? JSON.parse(userStr) : null;

      //       if (!user) {
      //         socket.emit("error", { message: "User not authenticated" });
      //         return;
      //       }

      //       const messageData = {
      //         id: Date.now().toString(),
      //         senderId: user.userId || user.id,
      //         senderUsername: user.username,
      //         recipientId: data.recipientId,
      //         conversationId:
      //           data.conversationId ||
      //           `${user.userId || user.id}-${data.recipientId}`,
      //         message: data.message,
      //         messageType: data.messageType || "text",
      //         timestamp: new Date().toISOString(),
      //         status: "sent",
      //       };
      //       console.log(messageData, "Message Data");
      //       // console.log(data.userId, "User ID in socket message");
      //       // Save message to database if userId is provided
      //       if (data.userId) {
      //         // TODO: Save message to MongoDB
      //         const newMessage = new Message({
      //           sender: data.userId,
      //           recipient: data.recipientId,
      //           conversationId: messageData.conversationId,
      //           content: data.message,
      //           messageType: data.messageType || "text",
      //         });
      //         await newMessage.save();
      //       }

      //       // Send to recipient if they're online
      //       const recipientSocketId = await redisClient.hGet(
      //         "userSockets",
      //         data.recipientId
      //       );
      //       if (recipientSocketId) {
      //         io.to(recipientSocketId).emit("newDirectMessage", messageData);
      //         messageData.status = "delivered";
      //       }

      //       // Send confirmation back to sender
      //       socket.emit("messageSent", messageData);

      //       console.log(
      //         `💬 Direct message from ${user.username} to ${data.recipientId}: ${data.message}`
      //       );
      //     } catch (error) {
      //       console.error("Error in sendDirectMessage event:", error);
      //       socket.emit("error", { message: "Failed to send message" });
      //     }
      //   }
      // );
      socket.on(
        "sendDirectMessage",
        async (data: {
          recipientId: string;
          message: string;
          messageType?: string;
        }) => {
          try {
            // 1️⃣ Get authenticated user
            const userStr = await redisClient.hGet("connectedUsers", socket.id);
            const user = userStr ? JSON.parse(userStr) : null;

            if (!user) {
              socket.emit("error", { message: "User not authenticated" });
              return;
            }

            const senderId = user.userId;

            let conversation = await Conversation.findOne({
              participants: { $all: [senderId, data.recipientId] },
            });

            if (!conversation) {
              conversation = await Conversation.create({
                participants: [senderId, data.recipientId],
              });
            }

            const newMessage = await Message.create({
              conversation: conversation._id,
              sender: senderId,
              recipient: data.recipientId,
              content: data.message,
              messageType: data.messageType || "text",
              status: "sent",
            });

            // 4️⃣ Prepare payload for socket
            const messagePayload = {
              _id: newMessage._id,
              conversationId: conversation._id,
              senderId,
              senderUsername: user.username,
              recipientId: data.recipientId,
              message: data.message,
              messageType: newMessage.messageType,
              timestamp: newMessage.createdAt,
              status: "sent",
            };
            console.log(messagePayload, "Message Payload");
            // 5️⃣ Emit to recipient if online
            const recipientSocketId = await redisClient.hGet(
              "userSockets",
              data.recipientId
            );
            console.log(recipientSocketId, "Socket Id");

            if (recipientSocketId) {
              io.to(recipientSocketId).emit("newDirectMessage", {
                ...messagePayload,
                status: "delivered",
              });

              await Message.findByIdAndUpdate(newMessage._id, {
                status: "delivered",
              });
            }

            // 6️⃣ Emit confirmation to sender
            socket.emit("messageSent", messagePayload);

            console.log(
              `💬 ${user.username} → ${data.recipientId}: ${data.message}`
            );
          } catch (error) {
            console.error("❌ sendDirectMessage error:", error);
            socket.emit("error", { message: "Failed to send message" });
          }
        }
      );

      // Handle typing indicator for direct messages
      socket.on(
        "typing",
        async (data: { recipientId: string; isTyping: boolean }) => {
          const userStr = await redisClient.hGet("connectedUsers", socket.id);
          const user = userStr ? JSON.parse(userStr) : null;
          if (!user) return;

          const recipientSocketId = await redisClient.hGet(
            "userSockets",
            data.recipientId
          );
          if (recipientSocketId) {
            io.to(recipientSocketId).emit("userTyping", {
              senderId: user.userId || user.id,
              senderUsername: user.username,
              isTyping: data.isTyping,
            });
          }
        }
      );

      // Handle message read receipts
      socket.on(
        "markAsRead",
        async (data: { messageId: string; senderId: string }) => {
          const userStr = await redisClient.hGet("connectedUsers", socket.id);
          const user = userStr ? JSON.parse(userStr) : null;
          if (!user) return;

          const senderSocketId = await redisClient.hGet(
            "userSockets",
            data.senderId
          );
          if (senderSocketId) {
            io.to(senderSocketId).emit("messageRead", {
              messageId: data.messageId,
              readBy: user.userId || user.id,
              readAt: new Date().toISOString(),
            });
          }

          // TODO: Update message status in database
        }
      );
      // Handle disconnection
      socket.on("disconnect", async () => {
        const userStr = await redisClient.hGet("connectedUsers", socket.id);
        const user = userStr ? JSON.parse(userStr) : null;
        if (user) {
          // Update user offline status in database if userId is provided
          if (user.userId) {
            // TODO: Update user offline status in MongoDB
            // await User.findByIdAndUpdate(user.userId, { isOnline: false, lastSeen: new Date() });
          }

          // Remove from Redis
          await redisClient.hDel("connectedUsers", socket.id);
          if (user.userId) {
            await redisClient.hDel("userSockets", user.userId);
          }

          // Notify all other users that this user is offline
          socket.broadcast.emit("userOffline", {
            id: user.userId || user.id,
            username: user.username,
            isOnline: false,
            lastSeen: new Date().toISOString(),
          });

          console.log(`👋 ${user.username} disconnected`);
        }
      });
    });
  }
}
