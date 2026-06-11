export interface AuthUser {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: string;
  createdAt?: string;
}

export interface Friend {
  id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: string;
}

export interface FriendRequest {
  _id: string;
  requester: {
    _id: string;
    username: string;
    avatar?: string;
  };
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  recipientId: string;
  message: string;
  messageType: 'text' | 'image' | 'audio' | 'file';
  timestamp: string;
  status: 'sent' | 'delivered' | 'seen';
}

export interface DbMessage {
  _id: string;
  sender: string | { _id: string; username: string };
  conversation: string;
  content: string;
  messageType: 'text' | 'image' | 'audio' | 'file';
  status: 'sent' | 'delivered' | 'seen';
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
