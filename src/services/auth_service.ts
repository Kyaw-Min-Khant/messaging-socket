import User from "../models/User";
import { LoginRequest, RegisterRequest } from "../types";
import { UnauthorizedError, ValidationError } from "./custom_error_service";
const ProfleImages = [
  "https://img.freepik.com/premium-vector/female-face-icon-flat-vector-design-woman-girl-profile-design-template-identity-concept_581136-214.jpg",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRH87TKQrWcl19xly2VNs0CjBzy8eaKNM-ZpA&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQyoGULN1LceEjH8Ek-RLyigv6HJm-UFYfZmg&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQnYh79e7N4rXkThhwCipY3mIfdJ6vavgRorgpEWZgVDw&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ8wR88BF7EWiIPx0AczdbsXk2sRKCUIxlItyuvBc_DNg&s",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR1abgZFHSN1dft87SClXpEhanK9ijEKqoZAw&s",
];
class AuthService {
  async register({ username, email, password }: RegisterRequest) {
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      throw new ValidationError(
        "User with this email or username already exists",
      );
    }
    const randomImage = ProfleImages[Math.round(Math.random() * 5)];

    const user = new User({
      username,
      email,
      password,
      avator: randomImage,
    });

    await user.save();

    return;
  }

  async login({ email, password, fcmtoken }: LoginRequest) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new ValidationError("User Not Found");
    }
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Password is incorrect !");
    }
    const randomImage = ProfleImages[Math.round(Math.random() * 5)];

    if (!user.avatar) user.avatar = randomImage;
    user.fcmtoken = fcmtoken;
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
