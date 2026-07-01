import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "@app/shared-errors";
import * as expenseService from "../services/expense_service";
import { serializeExpense } from "../utils/serializeExpense";

function requireUserId(req: Request): string {
  if (!req.user?.userId) {
    throw new UnauthorizedError("User not authenticated");
  }
  return req.user.userId;
}

export async function createExpenseController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = requireUserId(req);
    const expense = await expenseService.createExpense(userId, req.body);
    res.status(201).json({
      success: true,
      message: "Expense created successfully",
      data: serializeExpense(expense),
    });
  } catch (err) {
    next(err);
  }
}

export async function listExpensesController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = requireUserId(req);
    const { items, pagination } = await expenseService.listExpenses(
      userId,
      req.query as Record<string, string>,
    );
    res.status(200).json({
      success: true,
      data: items.map(serializeExpense),
      pagination,
    });
  } catch (err) {
    next(err);
  }
}

export async function getExpenseController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = requireUserId(req);
    const expense = await expenseService.getExpenseById(userId, req.params.id);
    res.status(200).json({ success: true, data: serializeExpense(expense) });
  } catch (err) {
    next(err);
  }
}

export async function updateExpenseController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = requireUserId(req);
    const expense = await expenseService.updateExpense(
      userId,
      req.params.id,
      req.body,
    );
    res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      data: serializeExpense(expense),
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteExpenseController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = requireUserId(req);
    await expenseService.deleteExpense(userId, req.params.id);
    res.status(200).json({ success: true, message: "Expense deleted successfully" });
  } catch (err) {
    next(err);
  }
}

export async function getSummaryController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = requireUserId(req);
    const summary = await expenseService.getSummary(
      userId,
      req.query as Record<string, string>,
    );
    res.status(200).json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
}
