import { Prisma } from "@prisma/client";
import { NotFoundError } from "@app/shared-errors";
import { prisma } from "../config/prisma";
import {
  validateCreateExpense,
  validateUpdateExpense,
  assertValidCategoryFilter,
} from "../validators/expense_validator";
import {
  CreateExpenseBody,
  ListExpensesQuery,
  SummaryQuery,
  UpdateExpenseBody,
} from "../types";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function createExpense(userId: string, body: CreateExpenseBody) {
  const validated = validateCreateExpense(body);
  return prisma.expense.create({
    data: {
      userId,
      amount: new Prisma.Decimal(validated.amount),
      currency: validated.currency,
      category: validated.category,
      description: validated.description,
      spentAt: new Date(validated.spentAt),
    },
  });
}

export async function listExpenses(userId: string, query: ListExpensesQuery) {
  const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(query.limit ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
  );
  const category = assertValidCategoryFilter(query.category);

  const where: Prisma.ExpenseWhereInput = {
    userId,
    ...(category ? { category } : {}),
    ...(query.startDate || query.endDate
      ? {
          spentAt: {
            ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
            ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { spentAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getExpenseById(userId: string, id: string) {
  const expense = await prisma.expense.findFirst({ where: { id, userId } });
  if (!expense) {
    throw new NotFoundError("Expense not found.");
  }
  return expense;
}

export async function updateExpense(
  userId: string,
  id: string,
  body: UpdateExpenseBody,
) {
  const validated = validateUpdateExpense(body);
  const data: Prisma.ExpenseUpdateManyMutationInput = { ...validated };
  if (validated.amount !== undefined) {
    data.amount = new Prisma.Decimal(validated.amount as string);
  }
  if (validated.spentAt !== undefined) {
    data.spentAt = new Date(validated.spentAt as string);
  }

  const { count } = await prisma.expense.updateMany({
    where: { id, userId },
    data,
  });
  if (count === 0) {
    throw new NotFoundError("Expense not found.");
  }
  return getExpenseById(userId, id);
}

export async function deleteExpense(userId: string, id: string) {
  const { count } = await prisma.expense.deleteMany({ where: { id, userId } });
  if (count === 0) {
    throw new NotFoundError("Expense not found.");
  }
}

export async function getSummary(userId: string, query: SummaryQuery) {
  const now = new Date();
  const startDate = query.startDate
    ? new Date(query.startDate)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = query.endDate ? new Date(query.endDate) : now;
  const groupBy = query.groupBy === "category" ? "category" : "day";

  const totalResult = await prisma.expense.aggregate({
    where: { userId, spentAt: { gte: startDate, lte: endDate } },
    _sum: { amount: true },
  });
  const totalAmount = (totalResult._sum.amount ?? new Prisma.Decimal(0)).toFixed(2);

  if (groupBy === "category") {
    const grouped = await prisma.expense.groupBy({
      by: ["category"],
      where: { userId, spentAt: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
      _count: true,
    });
    return {
      totalAmount,
      byCategory: grouped.map((g) => ({
        category: g.category,
        total: (g._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
        count: g._count,
      })),
    };
  }

  const byDay = await prisma.$queryRaw<{ day: Date; total: Prisma.Decimal }[]>`
    SELECT DATE_TRUNC('day', spent_at) AS day, SUM(amount) AS total
    FROM expenses
    WHERE user_id = ${userId} AND spent_at >= ${startDate} AND spent_at <= ${endDate}
    GROUP BY day
    ORDER BY day ASC
  `;

  return {
    totalAmount,
    byDay: byDay.map((row) => ({
      date: row.day.toISOString().slice(0, 10),
      total: new Prisma.Decimal(row.total).toFixed(2),
    })),
  };
}
