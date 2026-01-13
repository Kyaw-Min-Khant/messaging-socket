import { Router } from "express";
import {
  addFriendController,
  confirmFriRequestControoler,
  getFriendListController,
  getFriendRequestListController,
  getMobileUserListController,
} from "../controllers/users_controller";
import { auth } from "../middleware/auth";

const router = Router();
router.get("/", auth as any, getMobileUserListController as any);
router.post("/addfriend", auth as any, addFriendController as any);
router.get(
  "/friendrequest",
  auth as any,
  getFriendRequestListController as any
);
router.put("/confirm_request", auth as any, confirmFriRequestControoler as any);
router.get("/friends", auth as any, getFriendListController as any);
export default router;

/**
 * @openapi
 * /v1/api/users:
 *   get:
 *     summary: Get list of mobile users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 user:
 *                   - id: ""
 *                     username: "johndoe"
 *                     email: "johndoe@example.com"
 *                     avatar: null
 *                     isOnline: true
 *                     lastSeen: "2026-01-10T04:19:21.875Z"
 */
