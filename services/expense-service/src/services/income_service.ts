import { Prisma } from "@prisma/client";
import { NotFoundError, ValidationError } from "@app/shared-errors";
import { prisma } from "../config/prisma";
import {
  assertValidAmount,
  assertValidCurrency,
  assertValidDate,
  assertValidDescription,
} from "../validators/expense_validator";
import { IncomeBody } from "../types";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function assertValidSource(source: unknown): string {
  if (typeof source !== "string" || !source.trim() || source.length > 100) {
    throw new ValidationError("source is required and must be under 100 characters");
  }
  return source.trim();
}

function validateIncome(body: IncomeBody, partial: boolean) {
  const data: Prisma.IncomeUncheckedUpdateInput = {};
  const has = (key: keyof IncomeBody) => !partial || body[key] !== undefined;

  if (has("amount")) data.amount = new Prisma.Decimal(assertValidAmount(body.amount));
  if (has("source")) data.source = assertValidSource(body.source);
  if (has("receivedAt")) data.receivedAt = new Date(assertValidDate(body.receivedAt, "receivedAt"));
  if (body.currency !== undefined || !partial) data.currency = assertValidCurrency(body.currency);
  if (body.description !== undefined)
    data.description = body.description === null ? null : assertValidDescription(body.description);
  return data;
}

export async function createIncome(userId: string, body: IncomeBody) {
  const data = validateIncome(body, false) as Omit<Prisma.IncomeUncheckedCreateInput, "userId">;
  return prisma.income.create({ data: { ...data, userId } });
}

export async function listIncome(userId: string, query: Record<string, string>) {
  const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(query.limit ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
  );
  const where: Prisma.IncomeWhereInput = {
    userId,
    ...(query.startDate || query.endDate
      ? {
          receivedAt: {
            ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
            ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
          },
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.income.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.income.count({ where }),
  ]);
  return {
    items,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getIncomeById(userId: string, id: string) {
  const income = await prisma.income.findFirst({ where: { id, userId } });
  if (!income) throw new NotFoundError("Income not found.");
  return income;
}

export async function updateIncome(userId: string, id: string, body: IncomeBody) {
  const data = validateIncome(body, true) as Prisma.IncomeUpdateManyMutationInput;
  const { count } = await prisma.income.updateMany({ where: { id, userId }, data });
  if (count === 0) throw new NotFoundError("Income not found.");
  return getIncomeById(userId, id);
}

export async function deleteIncome(userId: string, id: string) {
  const { count } = await prisma.income.deleteMany({ where: { id, userId } });
  if (count === 0) throw new NotFoundError("Income not found.");
}

export async function sumIncome(userId: string, start: Date, end: Date) {
  const result = await prisma.income.aggregate({
    where: { userId, receivedAt: { gte: start, lte: end } },
    _sum: { amount: true },
  });
  return result._sum.amount ?? new Prisma.Decimal(0);
}
