import { Request, Response, NextFunction } from "express";
import { CustomError } from "../services/custom_error_service";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  console.error("UNHANDLED ERROR 💥", err);

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};
