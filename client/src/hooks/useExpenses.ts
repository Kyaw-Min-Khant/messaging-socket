import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Expense, ExpenseFilters, Pagination } from "../types";
import { deleteExpense as apiDeleteExpense, getExpenses } from "../api/expenses";

/**
 * Loads a page of expenses. With `append`, pages after the first are added to
 * the existing list (for "Load more") instead of replacing it.
 */
export function useExpenses(filters: ExpenseFilters, { append = false }: { append?: boolean } = {}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const filtersKey = JSON.stringify(filters);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getExpenses(filters);
      const appending = append && (filters.page ?? 1) > 1;
      setExpenses((prev) => {
        if (!appending) return result.expenses;
        const seen = new Set(prev.map((e) => e.id));
        return [...prev, ...result.expenses.filter((e) => !seen.has(e.id))];
      });
      setPagination(result.pagination);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load expenses");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, append]);

  useEffect(() => {
    reload();
  }, [reload]);

  const removeExpense = useCallback(
    async (id: string) => {
      try {
        await apiDeleteExpense(id);
        toast.success("Expense deleted");
        reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete expense");
      }
    },
    [reload],
  );

  return { expenses, pagination, isLoading, reload, removeExpense };
}
