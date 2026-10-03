import { Router } from "express";
import { auth } from "../middleware/auth";
import {
  createBudgetController,
  deleteBudgetController,
  getBudgetStatusController,
  listBudgetsController,
  updateBudgetController,
} from "../controllers/budget_controller";

const router = Router();

router.get("/status", auth, getBudgetStatusController);
router.get("/", auth, listBudgetsController);
router.post("/", auth, createBudgetController);
router.put("/:id", auth, updateBudgetController);
router.delete("/:id", auth, deleteBudgetController);

export default router;
