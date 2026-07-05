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
  pagination?: Pagination;
}

export interface ExpenseCategoryItem {
  id: string;
  name: string;
  description?: string | null;
}

export type PaymentMethod = "CASH" | "KBZ_PAY" | "AYA_PAY" | "ONLINE_PAYMENT";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  KBZ_PAY: "KBZ Pay",
  AYA_PAY: "AYA Pay",
  ONLINE_PAYMENT: "Online Payment",
};

export interface Expense {
  id: string;
  userId: string;
  amount: string;
  currency: string;
  categoryId: string;
  category: string;
  paymentMethod: PaymentMethod;
  description?: string | null;
  spentAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ExpenseListResult {
  expenses: Expense[];
  pagination: Pagination;
}

export interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface DailyTotal {
  date: string;
  total: string;
}

export interface CategoryTotal {
  category: string;
  total: string;
  count: number;
}

export interface ExpenseSummary {
  totalAmount: string;
  byDay?: DailyTotal[];
  byCategory?: CategoryTotal[];
}
