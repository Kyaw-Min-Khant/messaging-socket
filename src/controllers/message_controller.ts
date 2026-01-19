import { NextFunction, Response } from "express";
import { AuthRequest } from "../types";
import { UnauthorizedError } from "../services/custom_error_service";
import message_service from "../services/message_service";

export const getMessageListById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req?.user?.id || !req?.params?.friend_id) {
      throw new UnauthorizedError("User not authenticated");
    }
    const messageList = await message_service.getMessageListByUser(
      req?.user?.id,
      req?.params?.friend_id,
      req.query?.page,
    );
    res.status(200).json({
      data: messageList,
    });
  } catch (e) {
    next(e);
  }
};
