import * as categoryService from "../services/category_service";
import { asyncHandler } from "../utils/asyncHandler";
import { requireUserId } from "../utils/requireUserId";

export const createCategoryController = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(requireUserId(req), req.body);
  res.status(201).json({ success: true, message: "Category created successfully", data: category });
});

export const updateCategoryController = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(requireUserId(req), req.params.id, req.body);
  res.status(200).json({ success: true, message: "Category updated successfully", data: category });
});

export const deleteCategoryController = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(requireUserId(req), req.params.id);
  res.status(200).json({ success: true, message: "Category deleted successfully" });
});
