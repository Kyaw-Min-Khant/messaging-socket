import { Router } from "express";
import authRoutes from "./auth";
import user_routes from "./user_route";
import message_routes from "./message_route";
const router = Router();

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use("/auth", authRoutes);
router.use("/users", user_routes);
router.use("/conversations", message_routes);
// TODO: Add more routes
// router.use('/users', userRoutes);
// router.use('/conversations', conversationRoutes);
// router.use('/messages', messageRoutes);
// router.use('/upload', uploadRoutes);

export default router;

/**
 * @openapi
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "64f1a2b3c4d5e6f7a8b9c0d1"
 *         username:
 *           type: string
 *           example: "johndoe"
 *         email:
 *           type: string
 *           example: "johndoe@example.com"
 *         avatar:
 *           type: string
 *           nullable: true
 *           example: "https://api.dicebear.com/7.x/avataaars/svg?seed=johndoe"
 *         isOnline:
 *           type: boolean
 *           example: true
 *         lastSeen:
 *           type: string
 *           format: date-time
 *           example: "2026-06-24T10:00:00.000Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Message:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "64f1a2b3c4d5e6f7a8b9c0d2"
 *         sender:
 *           type: string
 *           example: "64f1a2b3c4d5e6f7a8b9c0d1"
 *         conversation:
 *           type: string
 *           example: "64f1a2b3c4d5e6f7a8b9c0d3"
 *         content:
 *           type: string
 *           example: "Hello!"
 *         messageType:
 *           type: string
 *           enum: [text, image, audio, file]
 *           example: "text"
 *         fileUrl:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [sent, delivered, seen]
 *           example: "delivered"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     FriendRequest:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "64f1a2b3c4d5e6f7a8b9c0d4"
 *         requester:
 *           $ref: '#/components/schemas/User'
 *         receiver:
 *           $ref: '#/components/schemas/User'
 *         status:
 *           type: string
 *           enum: [pending, accepted, blocked]
 *           example: "pending"
 *         createdAt:
 *           type: string
 *           format: date-time
 *     ApiError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "An error occurred"
 *     SuccessMessage:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Operation successful"
 */

/**
 * @openapi
 * /v1/api/health:
 *   get:
 *     summary: Health check
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Server is running
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
 *                   example: "Server is running"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
