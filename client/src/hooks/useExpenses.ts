import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Expense, ExpenseFilters, Pagination } from "../types";
import { deleteExpense as apiDeleteExpense, getExpenses } from "../api/expenses";

export function useExpenses(filters: ExpenseFilters) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const filtersKey = JSON.stringify(filters);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getExpenses(filters);
      setExpenses(result.expenses);
      setPagination(result.pagination);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load expenses");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

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
