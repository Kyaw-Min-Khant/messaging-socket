import { Router } from "express";
import { auth } from "../middleware/auth";
import {
  createExpenseController,
  deleteExpenseController,
  getExpenseController,
  getSummaryController,
  listCategoriesController,
  listExpensesController,
  updateExpenseController,
} from "../controllers/expense_controller";
import {
  createCategoryController,
  deleteCategoryController,
  updateCategoryController,
} from "../controllers/category_controller";

const router = Router();

router.get("/categories", auth, listCategoriesController);
router.post("/categories", auth, createCategoryController);
router.put("/categories/:id", auth, updateCategoryController);
router.delete("/categories/:id", auth, deleteCategoryController);
router.get("/summary", auth, getSummaryController);
router.post("/", auth, createExpenseController);
router.get("/", auth, listExpensesController);
router.get("/:id", auth, getExpenseController);
router.put("/:id", auth, updateExpenseController);
router.delete("/:id", auth, deleteExpenseController);

export default router;
