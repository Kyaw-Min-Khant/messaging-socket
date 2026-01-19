import { Router } from "express";
import { auth } from "../middleware/auth";
import { getMessageListById } from "../controllers/message_controller";

const router = Router();

router.get("/:friend_id/messages", auth as any, getMessageListById as any);
export default router;
