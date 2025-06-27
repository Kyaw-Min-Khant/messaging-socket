import { Document } from 'mongoose';
import mongoose from 'mongoose';

// User related types
export interface IUser {
  username: string;
  email: string;
  password: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserDocument extends IUser, Document {}

// Message related types
export interface IMessage {
  sender: mongoose.Types.ObjectId;
  conversation: mongoose.Types.ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'audio' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  status: 'sent' | 'delivered' | 'seen';
  deliveredAt?: Date;
  seenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessageDocument extends IMessage, Document {}

// Conversation related types
export interface IConversation {
  participants: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId;
  unreadCount: { [userId: string]: number };
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversationDocument extends IConversation, Document {}

// Socket.IO event types
export interface SocketEvents {
  // Client to Server
  join: (data: { userId: string; token: string }) => void;
  sendMessage: (data: { conversationId: string; content: string; messageType: string; fileUrl?: string }) => void;
  typing: (data: { conversationId: string; isTyping: boolean }) => void;
  markAsSeen: (data: { messageId: string; conversationId: string }) => void;
  markAsDelivered: (data: { messageId: string; conversationId: string }) => void;
  
  // Server to Client
  userJoined: (data: { userId: string; username: string }) => void;
  userLeft: (data: { userId: string; username: string }) => void;
  newMessage: (data: IMessage) => void;
  userTyping: (data: { userId: string; username: string; isTyping: boolean; conversationId: string }) => void;
  messageDelivered: (data: { messageId: string; deliveredAt: Date }) => void;
  messageSeen: (data: { messageId: string; seenAt: Date }) => void;
  conversationUpdate: (data: { conversationId: string; lastMessage: IMessage }) => void;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Authentication types
export interface AuthRequest extends Request {
  user?: IUser;
}

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
}

// File upload types
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

// Request validation types
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateMessageRequest {
  conversationId: string;
  content: string;
  messageType: 'text' | 'image' | 'audio' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}

// Environment variables interface
export interface EnvironmentVariables {
  PORT: string;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CLIENT_URL: string;
  NODE_ENV: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_PRIVATE_KEY: string;
  FIREBASE_CLIENT_EMAIL: string;
  REDIS_URL: string;
  UPLOAD_PATH: string;
  MAX_FILE_SIZE: string;
} 