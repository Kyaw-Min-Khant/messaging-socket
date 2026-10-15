import { Router } from "express";
import {
  register,
  login,
  logout,
  getUser,
  updateFcmToken,
} from "../controllers/auth_controller";
import { auth } from "../middleware/auth";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.get("/user", auth as any, getUser as any);
router.post("/logout", auth as any, logout as any);
router.put("/fcmtoken", auth as any, updateFcmToken as any);

export default router;

/**
 * @openapi
 * /v1/api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 example: "johndoe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "johndoe@example.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "securepassword"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               success: true
 *               message: "User registered successfully"
 *       400:
 *         description: Validation error (missing fields, short username/password)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       409:
 *         description: Email or username already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *             example:
 *               success: false
 *               message: "email already exists."
 *       429:
 *         description: Too many registration attempts (10 per 15 min)
 */

/**
 * @openapi
 * /v1/api/auth/login:
 *   post:
 *     summary: Login and get JWT token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "johndoe@example.com"
 *               password:
 *                 type: string
 *                 example: "securepassword"
 *               fcmtoken:
 *                 type: string
 *                 description: Firebase Cloud Messaging token for push notifications (optional)
 *                 example: "fcm_token_here"
 *     responses:
 *       200:
 *         description: Login successful
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
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT bearer token. Pass in the Authorization header as "Bearer <token>"
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Missing email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       429:
 *         description: Too many login attempts (10 per 15 min)
 */

/**
 * @openapi
 * /v1/api/auth/user:
 *   get:
 *     summary: Get the currently authenticated user
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */

/**
 * @openapi
 * /v1/api/auth/logout:
 *   post:
 *     summary: Logout the current user
 *     description: Sets the user's online status to false and invalidates the server-side user cache.
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               success: true
 *               message: "Logout successful"
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */

/**
 * @openapi
 * /v1/api/auth/fcmtoken:
 *   put:
 *     summary: Update Firebase Cloud Messaging token
 *     description: Call this after the client receives a refreshed FCM token from Firebase to keep push notifications working.
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fcmtoken
 *             properties:
 *               fcmtoken:
 *                 type: string
 *                 example: "fcm_device_token_here"
 *     responses:
 *       200:
 *         description: FCM token updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               success: true
 *               message: "FCM token updated"
 *       400:
 *         description: fcmtoken is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */

/**
 * @openapi
 * /socket.io:
 *   get:
 *     summary: Socket.IO real-time connection
 *     description: |
 *       Connect via Socket.IO for real-time messaging. Pass the JWT token in the handshake auth object — unauthenticated connections are rejected before they open.
 *
 *       ## Connection
 *       ```javascript
 *       const socket = io('http://localhost:3001', {
 *         auth: { token: 'your_jwt_token' }
 *       });
 *       ```
 *
 *       ## Client → Server Events
 *
 *       **authenticate** (optional, backward compat)
 *       - Payload: none required
 *       - Description: Triggers `authenticated` confirmation. Identity comes from the JWT handshake, not the payload.
 *
 *       **sendDirectMessage**
 *       - Payload: `{ recipientId: string, message: string, messageType?: "text" | "image" | "audio" | "file" }`
 *       - Description: Send a direct message. Creates a conversation if one doesn't exist.
 *
 *       **typing**
 *       - Payload: `{ recipientId: string, isTyping: boolean }`
 *       - Description: Broadcast typing indicator to the recipient.
 *
 *       **markAsRead**
 *       - Payload: `{ messageId: string, senderId: string }`
 *       - Description: Mark a message as seen. Persists `status: "seen"` and `seenAt` to the database and notifies the sender.
 *
 *       ## Server → Client Events
 *
 *       **authenticated**
 *       - Payload: `{ user: { id: string, username: string } }`
 *
 *       **messageSent**
 *       - Payload: `{ _id, conversationId, senderId, senderUsername, recipientId, message, messageType, timestamp, status: "sent" }`
 *       - Description: Confirmed by server after message is saved. Emitted only to sender.
 *
 *       **newDirectMessage**
 *       - Payload: same as `messageSent` but `status: "delivered"`
 *       - Description: Emitted to the recipient when they are online. Message is automatically marked `delivered` in the database.
 *
 *       **userOnline** / **userOffline**
 *       - Payload: `{ id: string, username: string, isOnline: boolean, lastSeen?: string }`
 *
 *       **userTyping**
 *       - Payload: `{ senderId: string, senderUsername: string, isTyping: boolean }`
 *
 *       **messageRead**
 *       - Payload: `{ messageId: string, readBy: string, readAt: string }`
 *       - Description: Emitted to the original sender when their message is marked as read.
 *
 *       **error**
 *       - Payload: `{ message: string }`
 *     tags:
 *       - WebSocket
 *     responses:
 *       101:
 *         description: WebSocket upgrade successful
 *       401:
 *         description: Missing or invalid JWT token in handshake auth
 */
