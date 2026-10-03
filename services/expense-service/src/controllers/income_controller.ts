import * as incomeService from "../services/income_service";
import { asyncHandler } from "../utils/asyncHandler";
import { requireUserId } from "../utils/requireUserId";
import { serializeIncome } from "../utils/serializeExpense";

export const listIncomeController = asyncHandler(async (req, res) => {
  const { items, pagination } = await incomeService.listIncome(
    requireUserId(req),
    req.query as Record<string, string>,
  );
  res.status(200).json({ success: true, data: items.map(serializeIncome), pagination });
});

export const getIncomeController = asyncHandler(async (req, res) => {
  const income = await incomeService.getIncomeById(requireUserId(req), req.params.id);
  res.status(200).json({ success: true, data: serializeIncome(income) });
});

export const createIncomeController = asyncHandler(async (req, res) => {
  const income = await incomeService.createIncome(requireUserId(req), req.body);
  res.status(201).json({ success: true, message: "Income created successfully", data: serializeIncome(income) });
});

export const updateIncomeController = asyncHandler(async (req, res) => {
  const income = await incomeService.updateIncome(requireUserId(req), req.params.id, req.body);
  res.status(200).json({ success: true, message: "Income updated successfully", data: serializeIncome(income) });
});

export const deleteIncomeController = asyncHandler(async (req, res) => {
  await incomeService.deleteIncome(requireUserId(req), req.params.id);
  res.status(200).json({ success: true, message: "Income deleted successfully" });
});
