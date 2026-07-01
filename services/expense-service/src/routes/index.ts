import { Router } from "express";
import expenseRoutes from "./expense_route";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Expense service is running",
    timestamp: new Date().toISOString(),
  });
});

router.use("/expenses", expenseRoutes);

export default router;
