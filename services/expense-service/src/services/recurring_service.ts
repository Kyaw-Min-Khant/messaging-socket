import { Prisma, RecurringExpense, RecurringFrequency } from "@prisma/client";
import { NotFoundError, ValidationError } from "@app/shared-errors";
import { prisma } from "../config/prisma";
import {
  assertValidAmount,
  assertValidCategoryId,
  assertValidCurrency,
  assertValidDate,
  assertValidDescription,
  assertValidPaymentMethod,
} from "../validators/expense_validator";
import { RecurringBody } from "../types";
import { assertCategoryAccessible } from "./category_service";

const VALID_FREQUENCIES: RecurringFrequency[] = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];

// Bounds a single materialization pass (e.g. a DAILY rule started years ago).
// Anything left over is picked up by the next request.
const MAX_OCCURRENCES_PER_RUN = 366;

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function toDateOnly(value: string): Date {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Next occurrence after `current`. Monthly/yearly rules stay anchored to the
 * start date's day, so a rule starting Jan 31 runs Feb 28, then Mar 31.
 */
export function nextOccurrence(
  current: Date,
  frequency: RecurringFrequency,
  anchor: Date,
): Date {
  const y = current.getUTCFullYear();
  const m = current.getUTCMonth();
  switch (frequency) {
    case "DAILY":
      return new Date(Date.UTC(y, m, current.getUTCDate() + 1));
    case "WEEKLY":
      return new Date(Date.UTC(y, m, current.getUTCDate() + 7));
    case "MONTHLY": {
      const ny = m === 11 ? y + 1 : y;
      const nm = (m + 1) % 12;
      return new Date(Date.UTC(ny, nm, Math.min(anchor.getUTCDate(), daysInMonth(ny, nm))));
    }
    case "YEARLY": {
      const am = anchor.getUTCMonth();
      return new Date(Date.UTC(y + 1, am, Math.min(anchor.getUTCDate(), daysInMonth(y + 1, am))));
    }
  }
}

async function materializeRule(rule: RecurringExpense, today: Date) {
  const dates: Date[] = [];
  let cursor = rule.nextRunAt;
  while (
    cursor <= today &&
    (!rule.endDate || cursor <= rule.endDate) &&
    dates.length < MAX_OCCURRENCES_PER_RUN
  ) {
    dates.push(cursor);
    cursor = nextOccurrence(cursor, rule.frequency, rule.startDate);
  }
  if (dates.length === 0) return;

  const finished = rule.endDate !== null && cursor > rule.endDate;

  await prisma.$transaction(async (tx) => {
    // Optimistic guard: if a concurrent request already advanced this rule,
    // count is 0 and we skip, so the same occurrences are never inserted twice.
    const { count } = await tx.recurringExpense.updateMany({
      where: { id: rule.id, nextRunAt: rule.nextRunAt },
      data: { nextRunAt: cursor, ...(finished ? { active: false } : {}) },
    });
    if (count === 0) return;

    await tx.expense.createMany({
      data: dates.map((spentAt) => ({
        userId: rule.userId,
        amount: rule.amount,
        currency: rule.currency,
        categoryId: rule.categoryId,
        paymentMethod: rule.paymentMethod,
        description: rule.description,
        spentAt,
        recurringId: rule.id,
      })),
    });
  });
}

/** Creates any expenses that recurring rules owe up to today. Idempotent. */
export async function materializeDue(userId: string) {
  const today = todayUtc();
  const due = await prisma.recurringExpense.findMany({
    where: { userId, active: true, nextRunAt: { lte: today } },
  });
  for (const rule of due) {
    await materializeRule(rule, today);
  }
}

function validateRecurring(body: RecurringBody, partial: boolean) {
  const data: Record<string, unknown> = {};
  const has = (key: keyof RecurringBody) => !partial || body[key] !== undefined;

  if (has("amount")) data.amount = new Prisma.Decimal(assertValidAmount(body.amount));
  if (has("categoryId")) data.categoryId = assertValidCategoryId(body.categoryId);
  if (has("frequency")) {
    if (!VALID_FREQUENCIES.includes(body.frequency as RecurringFrequency)) {
      throw new ValidationError(`frequency must be one of: ${VALID_FREQUENCIES.join(", ")}`);
    }
    data.frequency = body.frequency;
  }
  if (has("startDate")) data.startDate = toDateOnly(assertValidDate(body.startDate, "startDate"));
  if (body.currency !== undefined || !partial) data.currency = assertValidCurrency(body.currency);
  if (body.paymentMethod !== undefined || !partial)
    data.paymentMethod = assertValidPaymentMethod(body.paymentMethod);
  if (body.description !== undefined)
    data.description = body.description === null ? null : assertValidDescription(body.description);
  if (body.endDate !== undefined)
    data.endDate = body.endDate === null ? null : toDateOnly(assertValidDate(body.endDate, "endDate"));
  return data;
}

async function getOwnRule(userId: string, id: string) {
  const rule = await prisma.recurringExpense.findFirst({
    where: { id, userId },
    include: { category: true },
  });
  if (!rule) throw new NotFoundError("Recurring expense not found.");
  return rule;
}

export async function listRecurring(userId: string) {
  return prisma.recurringExpense.findMany({
    where: { userId },
    include: { category: true },
    orderBy: [{ active: "desc" }, { nextRunAt: "asc" }],
  });
}

export async function getRecurring(userId: string, id: string) {
  return getOwnRule(userId, id);
}

export async function createRecurring(userId: string, body: RecurringBody) {
  const data = validateRecurring(body, false) as Prisma.RecurringExpenseUncheckedCreateInput;
  await assertCategoryAccessible(userId, data.categoryId);
  if (data.endDate && data.endDate < data.startDate) {
    throw new ValidationError("endDate must be on or after startDate");
  }
  const rule = await prisma.recurringExpense.create({
    data: { ...data, userId, nextRunAt: data.startDate },
  });
  await materializeRule(rule, todayUtc());
  return getOwnRule(userId, rule.id);
}

export async function updateRecurring(userId: string, id: string, body: RecurringBody) {
  const existing = await getOwnRule(userId, id);
  const data = validateRecurring(body, true) as Prisma.RecurringExpenseUncheckedUpdateInput;
  if (typeof data.categoryId === "string") await assertCategoryAccessible(userId, data.categoryId);

  const startDate = (data.startDate as Date | undefined) ?? existing.startDate;
  const endDate = data.endDate === undefined ? existing.endDate : (data.endDate as Date | null);
  if (endDate && endDate < startDate) {
    throw new ValidationError("endDate must be on or after startDate");
  }
  // Changing the schedule only affects future occurrences; already-generated
  // expenses are left as they are.
  if (data.startDate || data.frequency) {
    const frequency = (data.frequency as RecurringFrequency | undefined) ?? existing.frequency;
    // Everything before existing.nextRunAt has already been generated, so the
    // new schedule resumes at its first occurrence on or after that date.
    let next = startDate;
    while (next < existing.nextRunAt) next = nextOccurrence(next, frequency, startDate);
    data.nextRunAt = next;
  }

  await prisma.recurringExpense.update({ where: { id }, data });
  return getOwnRule(userId, id);
}

export async function setRecurringActive(userId: string, id: string, active: boolean) {
  const rule = await getOwnRule(userId, id);
  const data: Prisma.RecurringExpenseUpdateInput = { active };
  if (active) {
    // Resuming skips the paused period instead of back-filling it.
    let next = rule.nextRunAt;
    const today = todayUtc();
    while (next < today) next = nextOccurrence(next, rule.frequency, rule.startDate);
    data.nextRunAt = next;
  }
  await prisma.recurringExpense.update({ where: { id }, data });
  return getOwnRule(userId, id);
}

export async function deleteRecurring(userId: string, id: string) {
  const { count } = await prisma.recurringExpense.deleteMany({ where: { id, userId } });
  if (count === 0) throw new NotFoundError("Recurring expense not found.");
}
