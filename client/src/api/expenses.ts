import apiClient from "./client";
import type {
  ApiResponse,
  Expense,
  ExpenseCategoryItem,
  ExpenseFilters,
  ExpenseListResult,
  ExpenseSummary,
  Pagination,
} from "../types";

export interface CreateExpenseInput {
  amount: number | string;
  currency?: string;
  categoryId: string;
  paymentMethod?: import("../types").PaymentMethod;
  description?: string;
  spentAt: string;
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>;

export async function getExpenseCategories(): Promise<ExpenseCategoryItem[]> {
  const { data } = await apiClient.get<ApiResponse<ExpenseCategoryItem[]>>("/expenses/categories");
  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to fetch categories");
  }
  return data.data;
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const { data } = await apiClient.post<ApiResponse<Expense>>("/expenses", input);
  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to create expense");
  }
  return data.data;
}

export async function getExpenses(filters: ExpenseFilters = {}): Promise<ExpenseListResult> {
  const { data } = await apiClient.get<ApiResponse<Expense[]>>("/expenses", {
    params: filters,
  });
  if (!data.success) {
    throw new Error(data.message ?? "Failed to fetch expenses");
  }
  const defaultPagination: Pagination = { page: 1, limit: 20, total: 0, totalPages: 0 };
  return {
    expenses: data.data ?? [],
    pagination: data.pagination ?? defaultPagination,
  };
}

export async function getExpenseById(id: string): Promise<Expense> {
  const { data } = await apiClient.get<ApiResponse<Expense>>(`/expenses/${id}`);
  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Expense not found");
  }
  return data.data;
}

export async function updateExpense(id: string, input: UpdateExpenseInput): Promise<Expense> {
  const { data } = await apiClient.put<ApiResponse<Expense>>(`/expenses/${id}`, input);
  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to update expense");
  }
  return data.data;
}

export async function deleteExpense(id: string): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse>(`/expenses/${id}`);
  if (!data.success) {
    throw new Error(data.message ?? "Failed to delete expense");
  }
}

export async function getExpenseSummary(params: {
  startDate?: string;
  endDate?: string;
  groupBy: "day" | "category";
}): Promise<ExpenseSummary> {
  const { data } = await apiClient.get<ApiResponse<ExpenseSummary>>("/expenses/summary", {
    params,
  });
  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to fetch summary");
  }
  return data.data;
}
