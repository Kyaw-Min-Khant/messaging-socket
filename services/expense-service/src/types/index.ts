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
  recurringId: string | null;
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

export interface CategoryBody {
  name?: string;
  description?: string | null;
}

export interface BudgetBody {
  categoryId?: string | null;
  amount?: number | string;
  currency?: string;
}

export interface BudgetWarning {
  budgetId: string;
  category: string | null;
  limit: string;
  spent: string;
  percentUsed: number;
  exceeded: boolean;
}

export interface IncomeBody {
  amount?: number | string;
  currency?: string;
  source?: string;
  description?: string | null;
  receivedAt?: string;
}

export interface IncomeDTO {
  id: string;
  userId: string;
  amount: string;
  currency: string;
  source: string;
  description: string | null;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type RecurringFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface RecurringBody {
  amount?: number | string;
  currency?: string;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
  description?: string | null;
  frequency?: RecurringFrequency;
  startDate?: string;
  endDate?: string | null;
}

export interface RecurringDTO {
  id: string;
  amount: string;
  currency: string;
  categoryId: string;
  category: string;
  paymentMethod: PaymentMethod;
  description: string | null;
  frequency: RecurringFrequency;
  startDate: string;
  endDate: string | null;
  nextRunAt: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
