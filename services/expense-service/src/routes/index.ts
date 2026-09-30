import { Router } from "express";
import expenseRoutes from "./expense_route";

const router = Router();

// NOTE: /v1/api/health is registered directly on the app (src/app.ts), ahead
// of the rate limiter and the internal guard, so probes are never throttled
// or rejected. Do not re-add it here — it would be unreachable.

router.use("/expenses", expenseRoutes);

export default router;
