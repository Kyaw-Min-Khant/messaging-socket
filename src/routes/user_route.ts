import { Router } from "express";
import {
  addFriendController,
  confirmFriRequestControoler,
  getFriendListController,
  getFriendRequestListController,
  getMobileUserListController,
  updateAvatarController,
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
router.put("/avatar", auth as any, updateAvatarController as any);
export default router;

/**
 * @openapi
 * /v1/api/users:
 *   get:
 *     summary: Get discoverable users
 *     description: Returns users excluding the current user and existing friends. Supports pagination.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Results per page
 *     responses:
 *       200:
 *         description: List of discoverable users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */

/**
 * @openapi
 * /v1/api/users/addfriend:
 *   post:
 *     summary: Send a friend request
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - friend_id
 *             properties:
 *               friend_id:
 *                 type: string
 *                 description: The user ID to send a friend request to
 *                 example: "64f1a2b3c4d5e6f7a8b9c0d1"
 *     responses:
 *       201:
 *         description: Friend request sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               success: true
 *               message: "Friend request sent successfully"
 *       400:
 *         description: Invalid request (e.g. already friends or request already pending)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */

/**
 * @openapi
 * /v1/api/users/friendrequest:
 *   get:
 *     summary: Get pending incoming friend requests
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending friend requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FriendRequest'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */

/**
 * @openapi
 * /v1/api/users/confirm_request:
 *   put:
 *     summary: Accept a friend request
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - request_id
 *             properties:
 *               request_id:
 *                 type: string
 *                 description: The friend request document ID
 *                 example: "64f1a2b3c4d5e6f7a8b9c0d4"
 *     responses:
 *       201:
 *         description: Friend request accepted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               success: true
 *               message: "Friend Confirm Successful"
 *       400:
 *         description: Invalid request ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */

/**
 * @openapi
 * /v1/api/users/friends:
 *   get:
 *     summary: Get accepted friends list
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of accepted friends
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */

/**
 * @openapi
 * /v1/api/users/avatar:
 *   put:
 *     summary: Update profile avatar
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 description: URL of the new avatar image
 *                 example: "https://example.com/avatars/johndoe.png"
 *     responses:
 *       200:
 *         description: Avatar updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Avatar updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     avatar:
 *                       type: string
 *                       example: "https://example.com/avatars/johndoe.png"
 *       400:
 *         description: Avatar URL is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
