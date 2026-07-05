export type PaymentMethod = "CASH" | "KBZ_PAY" | "AYA_PAY" | "ONLINE_PAYMENT";

export interface ExpenseDTO {
  id: string;
  userId: string;
  amount: string;
  currency: string;
  categoryId: string;
  category: string;
  paymentMethod: PaymentMethod;
  description: string | null;
  spentAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseBody {
  amount: number | string;
  currency?: string;
  categoryId: string;
  paymentMethod?: PaymentMethod;
  description?: string;
  spentAt: string;
}

export type UpdateExpenseBody = Partial<CreateExpenseBody>;

export interface ListExpensesQuery {
  startDate?: string;
  endDate?: string;
  category?: string;
  page?: string;
  limit?: string;
}

export interface SummaryQuery {
  startDate?: string;
  endDate?: string;
  groupBy?: "day" | "category";
}
