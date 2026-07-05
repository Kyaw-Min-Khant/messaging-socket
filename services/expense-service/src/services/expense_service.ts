import { Expense, ExpenseCategory, Prisma } from "@prisma/client";
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

type ExpenseWithCategory = Expense & { category: ExpenseCategory };

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function listCategories() {
  return prisma.expenseCategory.findMany({ orderBy: { name: "asc" } });
}

export async function createExpense(
  userId: string,
  body: CreateExpenseBody,
): Promise<ExpenseWithCategory> {
  const validated = validateCreateExpense(body);
  return prisma.expense.create({
    data: {
      userId,
      amount: new Prisma.Decimal(validated.amount),
      currency: validated.currency,
      category: { connect: { id: validated.categoryId } },
      paymentMethod: validated.paymentMethod,
      description: validated.description,
      spentAt: new Date(validated.spentAt),
    },
    include: { category: true },
  });
}

export async function listExpenses(userId: string, query: ListExpensesQuery) {
  const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      parseInt(query.limit ?? String(DEFAULT_PAGE_SIZE), 10) ||
        DEFAULT_PAGE_SIZE,
    ),
  );
  const categoryName = assertValidCategoryFilter(query.category);

  const where: Prisma.ExpenseWhereInput = {
    userId,
    ...(categoryName ? { category: { name: categoryName } } : {}),
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
      include: { category: true },
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

export async function getExpenseById(
  userId: string,
  id: string,
): Promise<ExpenseWithCategory> {
  const expense = await prisma.expense.findFirst({
    where: { id, userId },
    include: { category: true },
  });
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
  const data: Prisma.ExpenseUncheckedUpdateManyInput = {};
  if (validated.amount !== undefined)
    data.amount = new Prisma.Decimal(validated.amount as string);
  if (validated.currency !== undefined)
    data.currency = validated.currency as string;
  if (validated.categoryId !== undefined)
    data.categoryId = validated.categoryId as string;
  if (validated.paymentMethod !== undefined)
    data.paymentMethod = validated.paymentMethod as Prisma.ExpenseUncheckedUpdateManyInput["paymentMethod"];
  if (validated.description !== undefined)
    data.description = validated.description as string | null;
  if (validated.spentAt !== undefined)
    data.spentAt = new Date(validated.spentAt as string);

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
  const totalAmount = (
    totalResult._sum.amount ?? new Prisma.Decimal(0)
  ).toFixed(2);

  if (groupBy === "category") {
    const grouped = await prisma.expense.groupBy({
      by: ["categoryId"],
      where: { userId, spentAt: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
      _count: true,
    });

    const categoryIds = grouped.map((g) => g.categoryId);
    const categories = await prisma.expenseCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    return {
      totalAmount,
      byCategory: grouped.map((g) => ({
        category: categoryMap.get(g.categoryId) ?? g.categoryId,
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
