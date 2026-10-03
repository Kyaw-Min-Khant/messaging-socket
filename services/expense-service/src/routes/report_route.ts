import { Router } from "express";
import { auth } from "../middleware/auth";
import {
  exportCsvController,
  getMonthlyReportController,
} from "../controllers/report_controller";

const router = Router();

router.get("/monthly", auth, getMonthlyReportController);
router.get("/export", auth, exportCsvController);

export default router;
