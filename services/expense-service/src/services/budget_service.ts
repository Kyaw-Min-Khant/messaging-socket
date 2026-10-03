import { Prisma } from "@prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "@app/shared-errors";
import { prisma } from "../config/prisma";
import {
  assertValidAmount,
  assertValidCurrency,
  parseMonth,
} from "../validators/expense_validator";
import { BudgetBody, BudgetWarning } from "../types";
import { assertCategoryAccessible } from "./category_service";
import { materializeDue } from "./recurring_service";

/** Share of the limit at which a create/update response starts warning. */
const WARNING_THRESHOLD = 80;

type BudgetWithCategory = Prisma.BudgetGetPayload<{ include: { category: true } }>;

export function serializeBudget(budget: BudgetWithCategory) {
  return {
    id: budget.id,
    categoryId: budget.categoryId,
    category: budget.category?.name ?? null,
    amount: budget.amount.toFixed(2),
    currency: budget.currency,
    createdAt: budget.createdAt.toISOString(),
    updatedAt: budget.updatedAt.toISOString(),
  };
}

export async function listBudgets(userId: string) {
  return prisma.budget.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function createBudget(userId: string, body: BudgetBody) {
  const categoryId = body.categoryId ? String(body.categoryId) : null;
  if (categoryId) await assertCategoryAccessible(userId, categoryId);

  const existing = await prisma.budget.findFirst({ where: { userId, categoryId } });
  if (existing) {
    throw new ConflictError(
      categoryId
        ? "A budget for this category already exists."
        : "An overall budget already exists.",
    );
  }
  return prisma.budget.create({
    data: {
      userId,
      categoryId,
      amount: new Prisma.Decimal(assertValidAmount(body.amount)),
      currency: assertValidCurrency(body.currency),
    },
    include: { category: true },
  });
}

export async function updateBudget(userId: string, id: string, body: BudgetBody) {
  if (body.categoryId !== undefined) {
    throw new ValidationError("categoryId cannot be changed; delete and recreate the budget.");
  }
  const data: Prisma.BudgetUpdateManyMutationInput = {};
  if (body.amount !== undefined) data.amount = new Prisma.Decimal(assertValidAmount(body.amount));
  if (body.currency !== undefined) data.currency = assertValidCurrency(body.currency);

  const { count } = await prisma.budget.updateMany({ where: { id, userId }, data });
  if (count === 0) throw new NotFoundError("Budget not found.");
  return prisma.budget.findUniqueOrThrow({ where: { id }, include: { category: true } });
}

export async function deleteBudget(userId: string, id: string) {
  const { count } = await prisma.budget.deleteMany({ where: { id, userId } });
  if (count === 0) throw new NotFoundError("Budget not found.");
}

function toStatus(budget: BudgetWithCategory, spent: Prisma.Decimal) {
  const limit = budget.amount;
  const percentUsed = limit.isZero() ? 0 : Number(spent.div(limit).mul(100).toFixed(1));
  return {
    budgetId: budget.id,
    categoryId: budget.categoryId,
    category: budget.category?.name ?? null,
    limit: limit.toFixed(2),
    spent: spent.toFixed(2),
    remaining: limit.minus(spent).toFixed(2),
    percentUsed,
    exceeded: spent.greaterThan(limit),
  };
}

async function spentByCategory(userId: string, start: Date, end: Date) {
  const grouped = await prisma.expense.groupBy({
    by: ["categoryId"],
    where: { userId, spentAt: { gte: start, lte: end } },
    _sum: { amount: true },
  });
  const map = new Map<string, Prisma.Decimal>();
  let total = new Prisma.Decimal(0);
  for (const g of grouped) {
    const sum = g._sum.amount ?? new Prisma.Decimal(0);
    map.set(g.categoryId, sum);
    total = total.plus(sum);
  }
  return { map, total };
}

export async function getBudgetStatus(userId: string, monthParam: unknown) {
  await materializeDue(userId);
  const { start, end, month } = parseMonth(monthParam);
  const [budgets, spent] = await Promise.all([
    listBudgets(userId),
    spentByCategory(userId, start, end),
  ]);
  return {
    month,
    budgets: budgets.map((b) =>
      toStatus(
        b,
        b.categoryId ? (spent.map.get(b.categoryId) ?? new Prisma.Decimal(0)) : spent.total,
      ),
    ),
  };
}

/**
 * Budgets touched by an expense in this category/month that are at or above
 * the warning threshold. Returned alongside expense create/update responses.
 */
export async function getBudgetWarnings(
  userId: string,
  categoryId: string,
  spentAt: Date,
): Promise<BudgetWarning[]> {
  const budgets = await prisma.budget.findMany({
    where: { userId, OR: [{ categoryId }, { categoryId: null }] },
    include: { category: true },
  });
  if (budgets.length === 0) return [];

  const month = `${spentAt.getUTCFullYear()}-${String(spentAt.getUTCMonth() + 1).padStart(2, "0")}`;
  const { start, end } = parseMonth(month);
  const spent = await spentByCategory(userId, start, end);

  return budgets
    .map((b) =>
      toStatus(
        b,
        b.categoryId ? (spent.map.get(b.categoryId) ?? new Prisma.Decimal(0)) : spent.total,
      ),
    )
    .filter((s) => s.percentUsed >= WARNING_THRESHOLD)
    .map(({ budgetId, category, limit, spent: used, percentUsed, exceeded }) => ({
      budgetId,
      category,
      limit,
      spent: used,
      percentUsed,
      exceeded,
    }));
}
