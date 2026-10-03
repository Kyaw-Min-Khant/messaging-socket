import { Router } from "express";
import expenseRoutes from "./expense_route";
import budgetRoutes from "./budget_route";
import incomeRoutes from "./income_route";
import reportRoutes from "./report_route";
import recurringRoutes from "./recurring_route";

const router = Router();

// NOTE: /v1/api/health is registered directly on the app (src/app.ts), ahead
// of the rate limiter and the internal guard, so probes are never throttled
// or rejected. Do not re-add it here — it would be unreachable.

// Feature sub-routers must be mounted before expenseRoutes, whose GET /:id
// would otherwise swallow /budgets, /income, etc.
router.use("/expenses/budgets", budgetRoutes);
router.use("/expenses/income", incomeRoutes);
router.use("/expenses/reports", reportRoutes);
router.use("/expenses/recurring", recurringRoutes);
router.use("/expenses", expenseRoutes);

export default router;
