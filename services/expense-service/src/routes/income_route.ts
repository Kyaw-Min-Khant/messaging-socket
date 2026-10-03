import { Router } from "express";
import { auth } from "../middleware/auth";
import {
  createIncomeController,
  deleteIncomeController,
  getIncomeController,
  listIncomeController,
  updateIncomeController,
} from "../controllers/income_controller";

const router = Router();

router.get("/", auth, listIncomeController);
router.post("/", auth, createIncomeController);
router.get("/:id", auth, getIncomeController);
router.put("/:id", auth, updateIncomeController);
router.delete("/:id", auth, deleteIncomeController);

export default router;
