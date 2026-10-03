import { Prisma } from "@prisma/client";
import { ValidationError } from "@app/shared-errors";
import { prisma } from "../config/prisma";
import { assertValidDate, parseMonth } from "../validators/expense_validator";
import { sumIncome } from "./income_service";
import { materializeDue } from "./recurring_service";

const ZERO = new Prisma.Decimal(0);
const MAX_EXPORT_ROWS = 10000;

export async function getMonthlyReport(userId: string, monthParam: unknown) {
  await materializeDue(userId);
  const { start, end, month } = parseMonth(monthParam);
  const where = { userId, spentAt: { gte: start, lte: end } };

  const [expenseTotal, incomeTotal, byCategory, byPayment, byDay] = await Promise.all([
    prisma.expense.aggregate({ where, _sum: { amount: true }, _count: true }),
    sumIncome(userId, start, end),
    prisma.expense.groupBy({ by: ["categoryId"], where, _sum: { amount: true }, _count: true }),
    prisma.expense.groupBy({ by: ["paymentMethod"], where, _sum: { amount: true }, _count: true }),
    prisma.$queryRaw<{ day: Date; total: Prisma.Decimal }[]>`
      SELECT spent_at AS day, SUM(amount) AS total
      FROM expenses
      WHERE user_id = ${userId} AND spent_at >= ${start} AND spent_at <= ${end}
      GROUP BY spent_at
      ORDER BY spent_at ASC
    `,
  ]);

  const categories = await prisma.expenseCategory.findMany({
    where: { id: { in: byCategory.map((c) => c.categoryId) } },
    select: { id: true, name: true },
  });
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const totalExpense = expenseTotal._sum.amount ?? ZERO;

  return {
    month,
    totalIncome: incomeTotal.toFixed(2),
    totalExpense: totalExpense.toFixed(2),
    net: incomeTotal.minus(totalExpense).toFixed(2),
    expenseCount: expenseTotal._count,
    byCategory: byCategory
      .map((c) => ({
        categoryId: c.categoryId,
        category: names.get(c.categoryId) ?? c.categoryId,
        total: (c._sum.amount ?? ZERO).toFixed(2),
        count: c._count,
      }))
      .sort((a, b) => Number(b.total) - Number(a.total)),
    byPaymentMethod: byPayment.map((p) => ({
      paymentMethod: p.paymentMethod,
      total: (p._sum.amount ?? ZERO).toFixed(2),
      count: p._count,
    })),
    byDay: byDay.map((row) => ({
      date: row.day.toISOString().slice(0, 10),
      total: new Prisma.Decimal(row.total).toFixed(2),
    })),
  };
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Neutralize spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export async function exportCsv(userId: string, query: Record<string, string>) {
  const type = query.type ?? "expense";
  if (type !== "expense" && type !== "income") {
    throw new ValidationError("type must be expense or income");
  }
  const { start: monthStart, end: monthEnd } = parseMonth(undefined);
  const start = query.from ? new Date(assertValidDate(query.from, "from")) : monthStart;
  const end = query.to ? new Date(assertValidDate(query.to, "to")) : monthEnd;
  const range = `${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}`;

  if (type === "income") {
    const rows = await prisma.income.findMany({
      where: { userId, receivedAt: { gte: start, lte: end } },
      orderBy: { receivedAt: "asc" },
      take: MAX_EXPORT_ROWS,
    });
    return {
      filename: `income_${range}.csv`,
      body: toCsv(
        ["Date", "Source", "Amount", "Currency", "Description"],
        rows.map((r) => [
          r.receivedAt.toISOString().slice(0, 10),
          r.source,
          r.amount.toFixed(2),
          r.currency,
          r.description,
        ]),
      ),
    };
  }

  await materializeDue(userId);
  const rows = await prisma.expense.findMany({
    where: { userId, spentAt: { gte: start, lte: end } },
    include: { category: true },
    orderBy: { spentAt: "asc" },
    take: MAX_EXPORT_ROWS,
  });
  return {
    filename: `expenses_${range}.csv`,
    body: toCsv(
      ["Date", "Category", "Amount", "Currency", "Payment Method", "Description", "Recurring"],
      rows.map((r) => [
        r.spentAt.toISOString().slice(0, 10),
        r.category.name,
        r.amount.toFixed(2),
        r.currency,
        r.paymentMethod,
        r.description,
        r.recurringId ? "yes" : "no",
      ]),
    ),
  };
}
