import { Router } from "express";
import { auth } from "../middleware/auth";
import {
  createRecurringController,
  deleteRecurringController,
  getRecurringController,
  listRecurringController,
  pauseRecurringController,
  resumeRecurringController,
  updateRecurringController,
} from "../controllers/recurring_controller";

const router = Router();

router.get("/", auth, listRecurringController);
router.post("/", auth, createRecurringController);
router.get("/:id", auth, getRecurringController);
router.put("/:id", auth, updateRecurringController);
router.post("/:id/pause", auth, pauseRecurringController);
router.post("/:id/resume", auth, resumeRecurringController);
router.delete("/:id", auth, deleteRecurringController);

export default router;
