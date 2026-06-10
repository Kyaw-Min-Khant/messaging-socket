import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { JwtPayload } from "../types";
import { redisClient } from "../config/redis";

const USER_CACHE_TTL = 60; // seconds

async function getCachedUser(userId: string) {
  const cacheKey = `user:${userId}`;
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Redis unavailable — fall through to DB
  }

  const user = await User.findById(userId).select("-password").lean();
  if (user) {
    const userWithId = { ...user, id: user._id.toString() };
    try {
      await redisClient.setEx(
        cacheKey,
        USER_CACHE_TTL,
        JSON.stringify(userWithId),
      );
    } catch {
      // Redis write failed — continue without caching
    }
    return userWithId;
  }
  return null;
}

export async function invalidateUserCache(userId: string) {
  try {
    await redisClient.del(`user:${userId}`);
  } catch {
    // Best-effort cache invalidation
  }
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const user = await getCachedUser(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User not found.",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ success: false, error: "Token expired." });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ success: false, error: "Invalid token." });
    }
    return next(error);
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return next();

    const secret = process.env.JWT_SECRET;
    if (!secret) return next();

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secret) as JwtPayload;
    const user = await getCachedUser(decoded.userId);
    if (user) req.user = user;
    return next();
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      return next();
    }
    return next(error);
  }
};
