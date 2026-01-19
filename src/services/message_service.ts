import mongoose from "mongoose";
import Conversation from "../models/Conversation";
import Message from "../models/Message";

class MessageService {
  async getMessageListByUser(
    user_id: mongoose.Types.ObjectId,
    friend_id: mongoose.Types.ObjectId,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    let getConvesationId = await Conversation.findOne({
      participants: { $all: [user_id, friend_id] },
    });
    if (!getConvesationId) {
      getConvesationId = await Conversation.create({
        participants: [user_id, friend_id],
      });
    }
    const messages = await Message.find({
      conversation: getConvesationId.id,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    return messages;
  }
}
export default new MessageService();
