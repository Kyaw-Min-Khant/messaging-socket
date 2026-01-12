import { NextFunction, Request, Response } from "express";
import { AuthRequest, RegisterRequest, LoginRequest } from "../types";
import auth_service from "../services/auth_service";
import {
  UnauthorizedError,
  ValidationError,
} from "../services/custom_error_service";
const ProfleImages = [
  "https://img.freepik.com/premium-vector/female-face-icon-flat-vector-design-woman-girl-profile-design-template-identity-concept_581136-214.jpg",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRH87TKQrWcl19xly2VNs0CjBzy8eaKNM-ZpA&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQyoGULN1LceEjH8Ek-RLyigv6HJm-UFYfZmg&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQnYh79e7N4rXkThhwCipY3mIfdJ6vavgRorgpEWZgVDw&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ8wR88BF7EWiIPx0AczdbsXk2sRKCUIxlItyuvBc_DNg&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR1abgZFHSN1dft87SClXpEhanK9ijEKqoZAw&s",
];

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username, email, password }: RegisterRequest = req.body;
    if (!username || !email || !password) {
      throw new ValidationError("All fields are required");
    }

    if (username.length < 3 || password.length < 6) {
      throw new ValidationError(
        "Username must be at least 3 characters long and password must be at least 6 characters long"
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
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;
    if (!email || !password) {
      throw new ValidationError("Email and password are required");
    }

    const { user, token } = await auth_service.login({ email, password });
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
  next: NextFunction
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
  next: NextFunction
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
