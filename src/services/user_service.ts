import mongoose from "mongoose";
import User from "../models/User";
import { ValidationError } from "./custom_error_service";
import Firend from "../models/Friend";
import Friend from "../models/Friend";

class UserService {
  async getAllUserListForMobile(id: mongoose.Types.ObjectId) {
    const userList = await User.find()
      .where("_id")
      .ne(id)
      .select("username avatar isOnline lastSeen");
    return userList;
  }

  async addFriend(
    requester_id: mongoose.Types.ObjectId,
    receiver_id: mongoose.Types.ObjectId
  ) {
    const friendRequest = await Firend.findOne({
      requester: requester_id,
      receiver: receiver_id,
    });
    console.log("friendRequest", friendRequest);

    if (friendRequest) {
      throw new ValidationError("Friend request already sent");
    }

    const newFriend = new Firend({
      requester: requester_id,
      receiver: receiver_id,
    });
    await newFriend.save();
  }

  async getFriendRequestList(user_id: mongoose.Types.ObjectId) {
    const friendRequests = await Firend.find({
      receiver: user_id,
      status: "pending",
    }).populate("requester", "username avatar isOnline lastSeen");
    return friendRequests;
  }

  async confirmFriendRequest(id: mongoose.Types.ObjectId) {
    await Firend.findByIdAndUpdate(id, {
      $set: { status: "accepted" },
    });
    return;
  }

  async getFriendList(user_id: mongoose.Types.ObjectId) {
    const friendsList = await Friend.find({
      $or: [{ requester: user_id }, { receiver: user_id }],
      status: "accepted",
    }).populate("requester receiver", "username avatar isOnline lastSeen");
    return friendsList;
  }
}

export default new UserService();
