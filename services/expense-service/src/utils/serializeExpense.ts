import { Expense, ExpenseCategory, Income, RecurringExpense } from "@prisma/client";
import { ExpenseDTO, IncomeDTO, RecurringDTO } from "../types";

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
    recurringId: expense.recurringId,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}

export function serializeIncome(income: Income): IncomeDTO {
  return {
    id: income.id,
    userId: income.userId,
    amount: income.amount.toFixed(2),
    currency: income.currency,
    source: income.source,
    description: income.description,
    receivedAt: income.receivedAt.toISOString().slice(0, 10),
    createdAt: income.createdAt.toISOString(),
    updatedAt: income.updatedAt.toISOString(),
  };
}

export function serializeRecurring(
  rule: RecurringExpense & { category: ExpenseCategory },
): RecurringDTO {
  return {
    id: rule.id,
    amount: rule.amount.toFixed(2),
    currency: rule.currency,
    categoryId: rule.categoryId,
    category: rule.category.name,
    paymentMethod: rule.paymentMethod,
    description: rule.description,
    frequency: rule.frequency,
    startDate: rule.startDate.toISOString().slice(0, 10),
    endDate: rule.endDate ? rule.endDate.toISOString().slice(0, 10) : null,
    nextRunAt: rule.nextRunAt.toISOString().slice(0, 10),
    active: rule.active,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}
