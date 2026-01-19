import admin from "firebase-admin";

class FCMService {
  async sendNotificationById(
    fcmtoken: string,
    username: string,
    message: string,
  ) {
    return admin.messaging().send({
      token: fcmtoken,
      notification: {
        title: username,
        body: message,
      },
    });
  }
}
export default new FCMService();
