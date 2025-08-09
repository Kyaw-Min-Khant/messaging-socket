import { Router } from "express";
import { getUserController } from "../controllers/users_controller";

const router = Router();
router.get('/users',getUserController);

export default router;