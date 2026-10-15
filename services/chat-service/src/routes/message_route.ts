import { Router } from "express";
import { auth } from "../middleware/auth";
import { getMessageListById } from "../controllers/message_controller";

const router = Router();

router.get("/:friend_id/messages", auth as any, getMessageListById as any);
export default router;

/**
 * @openapi
 * /v1/api/conversations/{friend_id}/messages:
 *   get:
 *     summary: Get message history with a user
 *     description: Returns paginated messages from the conversation with the specified user. Creates the conversation automatically if it doesn't exist yet.
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friend_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID of the other participant
 *         example: "64f1a2b3c4d5e6f7a8b9c0d1"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (most recent messages first)
 *     responses:
 *       200:
 *         description: Paginated message list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *             example:
 *               data:
 *                 - _id: "64f1a2b3c4d5e6f7a8b9c0d2"
 *                   sender: "64f1a2b3c4d5e6f7a8b9c0d1"
 *                   conversation: "64f1a2b3c4d5e6f7a8b9c0d3"
 *                   content: "Hello!"
 *                   messageType: "text"
 *                   status: "seen"
 *                   createdAt: "2026-06-24T10:00:00.000Z"
 *                   updatedAt: "2026-06-24T10:00:01.000Z"
 *       400:
 *         description: Invalid friend_id format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *             example:
 *               success: false
 *               message: "Invalid ID format."
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
