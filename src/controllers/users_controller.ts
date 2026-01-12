import { AuthRequest } from "./../types/index";
import { NextFunction, Request, Response } from "express";
import user_service from "../services/user_service";
import { UnauthorizedError } from "../services/custom_error_service";

export const getUserController = async (req: Request, res: Response) => {
  //    const user=  await redisClient.hGetAll('connectedUsers')
  return res.status(200).json({
    success: true,
    message: "Users fetched successfully",
    // data:user
  });
};

export const getMobileUserListController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req?.user?.id) {
      throw new UnauthorizedError("User not authenticated");
    }
    const page = parseInt(req?.query?.page) || 1;
    const limit = parseInt(req?.query?.limit) || 10;
    const skip = (page - 1) * limit;
    const userList = await user_service.getAllUserListForMobile(req?.user?.id);
    res.status(200).json({
      data: userList,
    });
  } catch (err) {
    next(err);
  }
};

export const addFriendController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req?.user?.id) {
      throw new UnauthorizedError("User not authenticated");
    }
    const { friend_id } = req.body;
    await user_service.addFriend(req?.user?.id, friend_id);
    res.status(201).json({
      success: true,
      message: "Friend request sent successfully",
    });
  } catch (e) {
    console.log("Error in Add Friend:", e);
    next(e);
  }
};

export const getFriendRequestListController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req?.user?.id) {
      throw new UnauthorizedError("User not authenticated");
    }
    const firendsRequestList = await user_service.getFriendRequestList(
      req?.user.id
    );
    console.log(firendsRequestList, "Fri List");
    res.status(200).json({
      data: firendsRequestList,
    });
  } catch (e) {
    console.log(e, "Get Friend Request");
    next(e);
  }
};

export const confirmFriRequestControoler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { friend_id } = req.body;
    if (!req?.user?.id) {
      throw new UnauthorizedError("User not authenticated");
    }
    await user_service.confirmFriendRequest(friend_id);
    res.status(201).json({
      success: true,
      message: "Friend Confirm Successful",
    });
  } catch (e) {
    next(e);
    console.log(e, "Error");
  }
};

export const getFriendListController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req?.user?.id) {
      throw new UnauthorizedError("User not authenticated");
    }
    const friendsList = await user_service.getFriendList(req?.user.id);
    res.status(200).json({
      data: friendsList,
    });
  } catch (e) {
    next(e);
  }
};
