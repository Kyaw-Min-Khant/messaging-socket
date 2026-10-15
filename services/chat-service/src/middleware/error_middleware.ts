import { Request, Response, NextFunction } from "express";
import { Error as MongooseError } from "mongoose";
import { CustomError } from "../services/custom_error_service";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof MongooseError.CastError) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid ID format." });
  }

  if (err instanceof MongooseError.ValidationError) {
    const message =
      Object.values(err.errors)[0]?.message ?? "Validation failed.";
    return res.status(400).json({ success: false, message });
  }

  // MongoDB duplicate key
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue ?? {})[0] ?? "field";
    return res
      .status(409)
      .json({ success: false, message: `${field} already exists.` });
  }

  console.error("UNHANDLED ERROR", err);

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};
