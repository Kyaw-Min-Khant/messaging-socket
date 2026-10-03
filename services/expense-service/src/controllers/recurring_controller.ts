import * as recurringService from "../services/recurring_service";
import { asyncHandler } from "../utils/asyncHandler";
import { requireUserId } from "../utils/requireUserId";
import { serializeRecurring } from "../utils/serializeExpense";

export const listRecurringController = asyncHandler(async (req, res) => {
  const rules = await recurringService.listRecurring(requireUserId(req));
  res.status(200).json({ success: true, data: rules.map(serializeRecurring) });
});

export const getRecurringController = asyncHandler(async (req, res) => {
  const rule = await recurringService.getRecurring(requireUserId(req), req.params.id);
  res.status(200).json({ success: true, data: serializeRecurring(rule) });
});

export const createRecurringController = asyncHandler(async (req, res) => {
  const rule = await recurringService.createRecurring(requireUserId(req), req.body);
  res.status(201).json({
    success: true,
    message: "Recurring expense created successfully",
    data: serializeRecurring(rule),
  });
});

export const updateRecurringController = asyncHandler(async (req, res) => {
  const rule = await recurringService.updateRecurring(requireUserId(req), req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: "Recurring expense updated successfully",
    data: serializeRecurring(rule),
  });
});

export const pauseRecurringController = asyncHandler(async (req, res) => {
  const rule = await recurringService.setRecurringActive(requireUserId(req), req.params.id, false);
  res.status(200).json({ success: true, message: "Recurring expense paused", data: serializeRecurring(rule) });
});

export const resumeRecurringController = asyncHandler(async (req, res) => {
  const rule = await recurringService.setRecurringActive(requireUserId(req), req.params.id, true);
  res.status(200).json({ success: true, message: "Recurring expense resumed", data: serializeRecurring(rule) });
});

export const deleteRecurringController = asyncHandler(async (req, res) => {
  await recurringService.deleteRecurring(requireUserId(req), req.params.id);
  res.status(200).json({ success: true, message: "Recurring expense deleted successfully" });
});
