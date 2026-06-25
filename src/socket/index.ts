import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { redisClient } from "../config/redis";
import Message from "../models/Message";
import User from "../models/User";
import Conversation from "../models/Conversation";
import fcm_service from "../services/fcm_service";
import { JwtPayload } from "../types";

export function registerSocketHandlers(io: Server) {
  // Validate JWT before accepting the connection — client must send token in handshake.auth
  io.use((socket, next) => {
    // Cookie takes priority; fall back to handshake.auth.token for non-browser clients
    let token: string | undefined = socket.handshake.auth?.token;
    const cookieHeader = socket.handshake.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      socket.data.userId = decoded.userId;
      socket.data.username = decoded.username;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string;
    const username = socket.data.username as string;

    try {
      // Auto-register using JWT-verified identity — no need to trust client-sent userId
      const userEntry = {
        id: socket.id,
        username,
        userId,
        socketId: socket.id,
        isOnline: true,
        lastSeen: new Date().toISOString(),
      };
      await Promise.all([
        redisClient.hSet("connectedUsers", socket.id, JSON.stringify(userEntry)),
        redisClient.hSet("userSockets", userId, socket.id),
        User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() }),
      ]);
      console.log(`🔌 ${username} connected: ${socket.id}`);
    } catch (error) {
      console.error("Error registering connected user:", error);
    }

    // Keep authenticate event for backward compat with existing clients
    socket.on("authenticate", () => {
      socket.emit("authenticated", { user: { id: userId, username } });
      socket.broadcast.emit("userOnline", { id: userId, username, isOnline: true });
    });

    socket.on(
      "sendDirectMessage",
      async (data: { recipientId: string; message: string; messageType?: string }) => {
        try {
          if (!data.recipientId || typeof data.recipientId !== "string") {
            socket.emit("error", { message: "Invalid recipient" });
            return;
          }

          let conversation = await Conversation.findOne({
            participants: { $all: [userId, data.recipientId] },
          });
          if (!conversation) {
            conversation = await Conversation.create({
              participants: [userId, data.recipientId],
            });
          }

          const newMessage = await Message.create({
            conversation: conversation._id,
            sender: userId,
            content: data.message,
            messageType: data.messageType || "text",
            status: "sent",
          });

          const messagePayload = {
            _id: newMessage._id,
            conversationId: conversation._id,
            senderId: userId,
            senderUsername: username,
            recipientId: data.recipientId,
            message: data.message,
            messageType: newMessage.messageType,
            timestamp: newMessage.createdAt,
            status: "sent",
          };

          const recipientSocketId = await redisClient.hGet("userSockets", data.recipientId);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit("newDirectMessage", {
              ...messagePayload,
              status: "delivered",
            });
            await Message.findByIdAndUpdate(newMessage._id, { status: "delivered" });
          }

          socket.emit("messageSent", messagePayload);

          // Only push if recipient has no active socket (they are offline/background)
          if (!recipientSocketId) {
            const recipient = await User.findById(data.recipientId).select("fcmtoken").lean();
            if (recipient?.fcmtoken) {
              const body =
                data.messageType === "audio" ? "Sent an audio message"
                : data.messageType === "image" ? "Sent an image"
                : data.message;
              fcm_service.sendMessageNotification(recipient.fcmtoken, {
                senderUsername: username,
                body,
                senderId: userId,
                conversationId: String(conversation._id),
                messageType: data.messageType || "text",
              });
            }
          }
        } catch (error) {
          console.error("❌ sendDirectMessage error:", error);
          socket.emit("error", { message: "Failed to send message" });
        }
      },
    );

    socket.on("typing", async (data: { recipientId: string; isTyping: boolean }) => {
      if (!data.recipientId || typeof data.recipientId !== "string") {
        socket.emit("error", { message: "Invalid recipient" });
        return;
      }
      const recipientSocketId = await redisClient.hGet("userSockets", data.recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("userTyping", {
          senderId: userId,
          senderUsername: username,
          isTyping: data.isTyping,
        });
      }
    });

    socket.on("markAsRead", async (data: { messageId: string; senderId: string }) => {
      try {
        await Message.findByIdAndUpdate(data.messageId, {
          status: "seen",
          seenAt: new Date(),
        });
        const senderSocketId = await redisClient.hGet("userSockets", data.senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageRead", {
            messageId: data.messageId,
            readBy: userId,
            readAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error("❌ markAsRead error:", error);
      }
    });

    socket.on("disconnect", async () => {
      try {
        await Promise.all([
          User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() }),
          redisClient.hDel("connectedUsers", socket.id),
          redisClient.hDel("userSockets", userId),
        ]);
        socket.broadcast.emit("userOffline", {
          id: userId,
          username,
          isOnline: false,
          lastSeen: new Date().toISOString(),
        });
        console.log(`👋 ${username} disconnected`);
      } catch (error) {
        console.error("Error on disconnect cleanup:", error);
      }
    });
  });
}
