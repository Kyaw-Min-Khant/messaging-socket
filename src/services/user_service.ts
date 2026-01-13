import mongoose from "mongoose";
import User from "../models/User";
import { ValidationError } from "./custom_error_service";
import Firend from "../models/Friend";
import Friend from "../models/Friend";

class UserService {
  async getAllUserListForMobile(id: mongoose.Types.ObjectId) {
    const relations = await Friend.find({
      $or: [{ requester: id }, { receiver: id }],
    });
    const excludedUserIds = relations.flatMap((rel) =>
      rel.requester.equals(id) ? rel.receiver : rel.requester
    );
    const userList = await User.find({
      _id: { $nin: [id, ...excludedUserIds] },
    }).select(" username avatar isOnline lastSeen");
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
    const releations = await Friend.find({
      $or: [{ requester: user_id }, { receiver: user_id }],
      status: "accepted",
    }).populate("requester receiver", "username avatar isOnline lastSeen");

    const friends = releations.map((rel) =>
      rel.requester._id.equals(user_id) ? rel.receiver : rel.requester
    );
    return friends;
  }
}

export default new UserService();
