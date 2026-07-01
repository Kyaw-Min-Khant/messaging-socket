import { ExpenseCategory } from "@prisma/client";
import { ValidationError } from "@app/shared-errors";
import { CreateExpenseBody, UpdateExpenseBody } from "../types";

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
const CATEGORIES = Object.values(ExpenseCategory);

function assertValidAmount(amount: unknown): string {
  const amountStr = typeof amount === "number" ? amount.toString() : amount;
  if (typeof amountStr !== "string" || !AMOUNT_PATTERN.test(amountStr)) {
    throw new ValidationError(
      "amount must be a positive number with at most 2 decimal places",
    );
  }
  if (Number(amountStr) <= 0) {
    throw new ValidationError("amount must be greater than 0");
  }
  return amountStr;
}

function assertValidCategory(category: unknown): ExpenseCategory {
  if (typeof category !== "string" || !CATEGORIES.includes(category as ExpenseCategory)) {
    throw new ValidationError(
      `category must be one of: ${CATEGORIES.join(", ")}`,
    );
  }
  return category as ExpenseCategory;
}

function assertValidSpentAt(spentAt: unknown): string {
  if (typeof spentAt !== "string" || isNaN(new Date(spentAt).getTime())) {
    throw new ValidationError("spentAt must be a valid ISO date string");
  }
  return spentAt;
}

function assertValidDescription(description: unknown): string | undefined {
  if (description === undefined || description === null) return undefined;
  if (typeof description !== "string" || description.length > 500) {
    throw new ValidationError("description must be a string under 500 characters");
  }
  return description;
}

export function validateCreateExpense(body: CreateExpenseBody) {
  return {
    amount: assertValidAmount(body.amount),
    currency: body.currency && typeof body.currency === "string" ? body.currency : "USD",
    category: assertValidCategory(body.category),
    description: assertValidDescription(body.description),
    spentAt: assertValidSpentAt(body.spentAt),
  };
}

export function validateUpdateExpense(body: UpdateExpenseBody) {
  const result: Record<string, unknown> = {};
  if (body.amount !== undefined) result.amount = assertValidAmount(body.amount);
  if (body.currency !== undefined) {
    if (typeof body.currency !== "string") {
      throw new ValidationError("currency must be a string");
    }
    result.currency = body.currency;
  }
  if (body.category !== undefined) result.category = assertValidCategory(body.category);
  if (body.description !== undefined) result.description = assertValidDescription(body.description);
  if (body.spentAt !== undefined) result.spentAt = assertValidSpentAt(body.spentAt);
  return result;
}

export function assertValidCategoryFilter(category: unknown): ExpenseCategory | undefined {
  if (category === undefined) return undefined;
  return assertValidCategory(category);
}
