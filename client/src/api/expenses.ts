import apiClient from "./client";
import type {
  ApiResponse,
  Budget,
  BudgetStatus,
  BudgetWarning,
  Expense,
  Income,
  MonthlyReport,
  PaymentMethod,
  RecurringExpense,
  RecurringFrequency,
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

export interface SaveExpenseResult {
  expense: Expense;
  budgetWarnings: BudgetWarning[];
}

type ExpenseSaveResponse = ApiResponse<Expense> & { budgetWarnings?: BudgetWarning[] };

export async function createExpense(input: CreateExpenseInput): Promise<SaveExpenseResult> {
  const { data } = await apiClient.post<ExpenseSaveResponse>("/expenses", input);
  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to create expense");
  }
  return { expense: data.data, budgetWarnings: data.budgetWarnings ?? [] };
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

export async function updateExpense(id: string, input: UpdateExpenseInput): Promise<SaveExpenseResult> {
  const { data } = await apiClient.put<ExpenseSaveResponse>(`/expenses/${id}`, input);
  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to update expense");
  }
  return { expense: data.data, budgetWarnings: data.budgetWarnings ?? [] };
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

/** Unwraps { success, data }, surfacing the server's error message when present. */
async function request<T>(promise: Promise<{ data: ApiResponse<T> }>, fallback: string): Promise<T> {
  try {
    const { data } = await promise;
    if (!data.success) throw new Error(data.message ?? fallback);
    return data.data as T;
  } catch (err) {
    const message =
      (err as { response?: { data?: { message?: string; error?: string } } }).response?.data
        ?.message ??
      (err as { response?: { data?: { error?: string } } }).response?.data?.error;
    throw new Error(message ?? (err instanceof Error ? err.message : fallback));
  }
}

// ── Categories ────────────────────────────────────────────────────────────────

export interface CategoryInput {
  name?: string;
  description?: string | null;
}

export const createCategory = (input: CategoryInput) =>
  request<ExpenseCategoryItem>(apiClient.post("/expenses/categories", input), "Failed to create category");

export const updateCategory = (id: string, input: CategoryInput) =>
  request<ExpenseCategoryItem>(apiClient.put(`/expenses/categories/${id}`, input), "Failed to update category");

export const deleteCategory = (id: string) =>
  request<void>(apiClient.delete(`/expenses/categories/${id}`), "Failed to delete category");

// ── Budgets ───────────────────────────────────────────────────────────────────

export interface BudgetInput {
  categoryId?: string | null;
  amount: string;
  currency?: string;
}

export const getBudgets = () => request<Budget[]>(apiClient.get("/expenses/budgets"), "Failed to load budgets");

export const getBudgetStatus = (month?: string) =>
  request<BudgetStatus>(apiClient.get("/expenses/budgets/status", { params: { month } }), "Failed to load budget status");

export const createBudget = (input: BudgetInput) =>
  request<Budget>(apiClient.post("/expenses/budgets", input), "Failed to create budget");

export const updateBudget = (id: string, input: { amount: string }) =>
  request<Budget>(apiClient.put(`/expenses/budgets/${id}`, input), "Failed to update budget");

export const deleteBudget = (id: string) =>
  request<void>(apiClient.delete(`/expenses/budgets/${id}`), "Failed to delete budget");

// ── Income ────────────────────────────────────────────────────────────────────

export interface IncomeInput {
  amount: string;
  currency?: string;
  source: string;
  description?: string | null;
  receivedAt: string;
}

export async function getIncome(params: { startDate?: string; endDate?: string; page?: number; limit?: number }) {
  const { data } = await apiClient.get<ApiResponse<Income[]>>("/expenses/income", { params });
  if (!data.success) throw new Error(data.message ?? "Failed to load income");
  const defaultPagination: Pagination = { page: 1, limit: 20, total: 0, totalPages: 0 };
  return { income: data.data ?? [], pagination: data.pagination ?? defaultPagination };
}

export const createIncome = (input: IncomeInput) =>
  request<Income>(apiClient.post("/expenses/income", input), "Failed to add income");

export const updateIncome = (id: string, input: Partial<IncomeInput>) =>
  request<Income>(apiClient.put(`/expenses/income/${id}`, input), "Failed to update income");

export const deleteIncome = (id: string) =>
  request<void>(apiClient.delete(`/expenses/income/${id}`), "Failed to delete income");

// ── Recurring ─────────────────────────────────────────────────────────────────

export interface RecurringInput {
  amount: string;
  currency?: string;
  categoryId: string;
  paymentMethod?: PaymentMethod;
  description?: string | null;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string | null;
}

export const getRecurring = () =>
  request<RecurringExpense[]>(apiClient.get("/expenses/recurring"), "Failed to load recurring expenses");

export const createRecurring = (input: RecurringInput) =>
  request<RecurringExpense>(apiClient.post("/expenses/recurring", input), "Failed to create recurring expense");

export const updateRecurring = (id: string, input: Partial<RecurringInput>) =>
  request<RecurringExpense>(apiClient.put(`/expenses/recurring/${id}`, input), "Failed to update recurring expense");

export const setRecurringActive = (id: string, active: boolean) =>
  request<RecurringExpense>(
    apiClient.post(`/expenses/recurring/${id}/${active ? "resume" : "pause"}`),
    "Failed to update recurring expense",
  );

export const deleteRecurring = (id: string) =>
  request<void>(apiClient.delete(`/expenses/recurring/${id}`), "Failed to delete recurring expense");

// ── Reports ───────────────────────────────────────────────────────────────────

export const getMonthlyReport = (month?: string) =>
  request<MonthlyReport>(apiClient.get("/expenses/reports/monthly", { params: { month } }), "Failed to load report");

/** Downloads a CSV through the authenticated client and saves it in the browser. */
export async function downloadCsv(params: { type: "expense" | "income"; from?: string; to?: string }) {
  const res = await apiClient.get<Blob>("/expenses/reports/export", { params, responseType: "blob" });
  const disposition = String(res.headers["content-disposition"] ?? "");
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `${params.type}_${params.from ?? ""}_${params.to ?? ""}.csv`;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
