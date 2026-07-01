import { Expense } from "@prisma/client";
import { ExpenseDTO } from "../types";

export function serializeExpense(expense: Expense): ExpenseDTO {
  return {
    ...expense,
    amount: expense.amount.toFixed(2),
    spentAt: expense.spentAt.toISOString().slice(0, 10),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}
