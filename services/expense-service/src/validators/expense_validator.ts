import { ValidationError } from "@app/shared-errors";
import { CreateExpenseBody, PaymentMethod, UpdateExpenseBody } from "../types";

const VALID_PAYMENT_METHODS: PaymentMethod[] = [
  "CASH",
  "KBZ_PAY",
  "AYA_PAY",
  "ONLINE_PAYMENT",
];

export function assertValidPaymentMethod(value: unknown): PaymentMethod {
  if (value === undefined || value === null) return "CASH";
  if (!VALID_PAYMENT_METHODS.includes(value as PaymentMethod)) {
    throw new ValidationError(
      `paymentMethod must be one of: ${VALID_PAYMENT_METHODS.join(", ")}`,
    );
  }
  return value as PaymentMethod;
}

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

export function assertValidAmount(amount: unknown): string {
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

export function assertValidCategoryId(categoryId: unknown): string {
  if (typeof categoryId !== "string" || !categoryId.trim()) {
    throw new ValidationError("categoryId is required");
  }
  return categoryId;
}

export function assertValidSpentAt(spentAt: unknown): string {
  if (typeof spentAt !== "string" || isNaN(new Date(spentAt).getTime())) {
    throw new ValidationError("spentAt must be a valid ISO date string");
  }
  return spentAt;
}

export function assertValidDescription(description: unknown): string | undefined {
  if (description === undefined || description === null) return undefined;
  if (typeof description !== "string" || description.length > 500) {
    throw new ValidationError(
      "description must be a string under 500 characters",
    );
  }
  return description;
}

export function validateCreateExpense(body: CreateExpenseBody) {
  return {
    amount: assertValidAmount(body.amount),
    currency:
      body.currency && typeof body.currency === "string"
        ? body.currency
        : "MMK",
    categoryId: assertValidCategoryId(body.categoryId),
    paymentMethod: assertValidPaymentMethod(body.paymentMethod),
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
  if (body.categoryId !== undefined)
    result.categoryId = assertValidCategoryId(body.categoryId);
  if (body.paymentMethod !== undefined)
    result.paymentMethod = assertValidPaymentMethod(body.paymentMethod);
  if (body.description !== undefined)
    result.description = assertValidDescription(body.description);
  if (body.spentAt !== undefined)
    result.spentAt = assertValidSpentAt(body.spentAt);
  return result;
}

export function assertValidCategoryFilter(
  category: unknown,
): string | undefined {
  if (category === undefined) return undefined;
  if (typeof category !== "string" || !category.trim()) return undefined;
  return category;
}

export function assertValidDate(value: unknown, field: string): string {
  if (typeof value !== "string" || isNaN(new Date(value).getTime())) {
    throw new ValidationError(`${field} must be a valid ISO date string`);
  }
  return value;
}

export function assertValidCurrency(value: unknown): string {
  if (value === undefined || value === null) return "MMK";
  if (typeof value !== "string" || !/^[A-Z]{3}$/.test(value)) {
    throw new ValidationError("currency must be a 3-letter ISO code");
  }
  return value;
}

/** Parses YYYY-MM (defaults to the current month) into an inclusive date range. */
export function parseMonth(month: unknown): { start: Date; end: Date; month: string } {
  const now = new Date();
  let year = now.getUTCFullYear();
  let monthIndex = now.getUTCMonth();
  if (month !== undefined && month !== "") {
    const match = typeof month === "string" ? /^(\d{4})-(\d{2})$/.exec(month) : null;
    if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) {
      throw new ValidationError("month must be in YYYY-MM format");
    }
    year = Number(match[1]);
    monthIndex = Number(match[2]) - 1;
  }
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return { start, end, month: `${year}-${String(monthIndex + 1).padStart(2, "0")}` };
}
