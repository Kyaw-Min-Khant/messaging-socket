import * as budgetService from "../services/budget_service";
import { asyncHandler } from "../utils/asyncHandler";
import { requireUserId } from "../utils/requireUserId";

export const listBudgetsController = asyncHandler(async (req, res) => {
  const budgets = await budgetService.listBudgets(requireUserId(req));
  res.status(200).json({ success: true, data: budgets.map(budgetService.serializeBudget) });
});

export const getBudgetStatusController = asyncHandler(async (req, res) => {
  const status = await budgetService.getBudgetStatus(requireUserId(req), req.query.month);
  res.status(200).json({ success: true, data: status });
});

export const createBudgetController = asyncHandler(async (req, res) => {
  const budget = await budgetService.createBudget(requireUserId(req), req.body);
  res.status(201).json({
    success: true,
    message: "Budget created successfully",
    data: budgetService.serializeBudget(budget),
  });
});

export const updateBudgetController = asyncHandler(async (req, res) => {
  const budget = await budgetService.updateBudget(requireUserId(req), req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: "Budget updated successfully",
    data: budgetService.serializeBudget(budget),
  });
});

export const deleteBudgetController = asyncHandler(async (req, res) => {
  await budgetService.deleteBudget(requireUserId(req), req.params.id);
  res.status(200).json({ success: true, message: "Budget deleted successfully" });
});
