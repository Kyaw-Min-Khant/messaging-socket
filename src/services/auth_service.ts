import User from "../models/User";
import { LoginRequest, RegisterRequest } from "../types";
import { UnauthorizedError, ValidationError } from "./custom_error_service";

class AuthService {
  async register({ username, email, password }: RegisterRequest) {
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      throw new ValidationError(
        "User with this email or username already exists"
      );
    }

    const user = new User({
      username,
      email,
      password,
    });

    await user.save();

    return;
  }

  async login({ email, password }: LoginRequest) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new ValidationError("User Not Found");
    }
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Password is incorrect !");
    }
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();
    const token = user.generateAuthToken();
    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    };
  }
}
export default new AuthService();
