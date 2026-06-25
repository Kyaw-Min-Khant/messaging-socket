import admin from "firebase-admin";

interface MessagePayload {
  senderUsername: string;
  body: string;
  senderId: string;
  conversationId: string;
  messageType: string;
}

class FCMService {
  async sendMessageNotification(fcmtoken: string, payload: MessagePayload) {
    try {
      await admin.messaging().send({
        token: fcmtoken,
        notification: {
          title: payload.senderUsername,
          body: payload.body,
        },
        data: {
          type: "message",
          senderId: payload.senderId,
          senderUsername: payload.senderUsername,
          conversationId: payload.conversationId,
          messageType: payload.messageType,
        },
        android: {
          priority: "high",
          notification: { sound: "default", channelId: "messages" },
        },
        apns: {
          payload: { aps: { sound: "default", badge: 1 } },
        },
      });
    } catch (error) {
      console.error("FCM send failed:", error);
    }
  }

  async sendFriendRequestNotification(fcmtoken: string, requesterUsername: string) {
    try {
      await admin.messaging().send({
        token: fcmtoken,
        notification: {
          title: "New friend request",
          body: `${requesterUsername} sent you a friend request`,
        },
        data: {
          type: "friend_request",
          requesterUsername,
        },
        android: {
          priority: "high",
          notification: { sound: "default", channelId: "default" },
        },
        apns: {
          payload: { aps: { sound: "default", badge: 1 } },
        },
      });
    } catch (error) {
      console.error("FCM friend request notification failed:", error);
    }
  }
}
export default new FCMService();
