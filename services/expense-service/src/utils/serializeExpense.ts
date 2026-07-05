import { Expense, ExpenseCategory } from "@prisma/client";
import { ExpenseDTO } from "../types";

type ExpenseWithCategory = Expense & { category: ExpenseCategory };

export function serializeExpense(expense: ExpenseWithCategory): ExpenseDTO {
  return {
    id: expense.id,
    userId: expense.userId,
    amount: expense.amount.toFixed(2),
    currency: expense.currency,
    categoryId: expense.categoryId,
    category: expense.category.name,
    paymentMethod: expense.paymentMethod,
    description: expense.description,
    spentAt: expense.spentAt.toISOString().slice(0, 10),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}
