import { NextFunction, Request, Response } from "express";
import { AuthRequest, RegisterRequest, LoginRequest } from "../types";
import auth_service from "../services/auth_service";
import {
  UnauthorizedError,
  ValidationError,
} from "../services/custom_error_service";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { username, email, password }: RegisterRequest = req.body;
    if (!username || !email || !password) {
      throw new ValidationError("All fields are required");
    }

    if (username.length < 3 || password.length < 6) {
      throw new ValidationError(
        "Username must be at least 3 characters long and password must be at least 6 characters long",
      );
    }

    await auth_service.register({
      username,
      email,
      password,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password, fcmtoken }: LoginRequest = req.body;
    if (!email || !password) {
      throw new ValidationError("Email and password are required");
    }
    const { user, token } = await auth_service.login({
      email,
      password,
      fcmtoken,
    });
    res.json({
      success: true,
      data: {
        user,
        token,
      },
      message: "Login successful",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/user
// @access  Private
export const getUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    // Update online status
    user.isOnline = false;
    user.lastSeen = new Date();
    await (user as any).save();

    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
};
