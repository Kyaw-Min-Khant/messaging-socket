import { Expense, ExpenseCategory } from "@prisma/client";

export type ExpenseDTO = Omit<Expense, "amount" | "spentAt" | "createdAt" | "updatedAt"> & {
  amount: string;
  spentAt: string;
  createdAt: string;
  updatedAt: string;
};

export interface CreateExpenseBody {
  amount: number | string;
  currency?: string;
  category: ExpenseCategory;
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
