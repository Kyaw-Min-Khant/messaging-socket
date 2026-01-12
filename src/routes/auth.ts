import { Router } from "express";
import {
  register,
  login,
  logout,
  getUser,
} from "../controllers/auth_controller";
import { auth } from "../middleware/auth";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.get("/user", auth as any, getUser as any);
router.post("/logout", auth as any, logout as any);

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
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request
 */

/**
 * @openapi
 * /v1/api/auth/login:
 *   post:
 *     summary: Login a user
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
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 */

/**
 * @openapi
 * /v1/api/auth/user:
 *   get:
 *     summary: Get current user info
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user info
 *       401:
 *         description: Unauthorized
 */

/**
 * @openapi
 * /v1/api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     SocketEvent:
 *       type: object
 *       properties:
 *         event:
 *           type: string
 *           description: Socket event name
 *         data:
 *           type: object
 *           description: Event payload
 *         description:
 *           type: string
 *           description: Event description
 *
 * /socket:
 *   get:
 *     summary: WebSocket Connection
 *     description: |
 *       Connect to Socket.IO for real-time messaging
 *
 *       ## Events
 *
 *       ### Client to Server
 *
 *       **authenticate**
 *       - Emit: `authenticate`
 *       - Payload: `{ username: string, userId?: string }`
 *       - Description: Authenticate user and join online users list
 *
 *       **sendDirectMessage**
 *       - Emit: `sendDirectMessage`
 *       - Payload: `{ recipientId: string, message: string, conversationId?: string, messageType?: string, userId?: string }`
 *       - Description: Send direct message to specific user
 *
 *       **typing**
 *       - Emit: `typing`
 *       - Payload: `{ recipientId: string, isTyping: boolean }`
 *       - Description: Send typing indicator to recipient
 *
 *       **markAsRead**
 *       - Emit: `markAsRead`
 *       - Payload: `{ messageId: string, senderId: string }`
 *       - Description: Mark message as read
 *
 *       ### Server to Client
 *
 *       **authenticated**
 *       - Listen: `authenticated`
 *       - Payload: `{ user: { id: string, username: string }, onlineUsers: Array }`
 *       - Description: Confirmation of successful authentication
 *
 *       **newDirectMessage**
 *       - Listen: `newDirectMessage`
 *       - Payload: `{ id: string, senderId: string, senderUsername: string, recipientId: string, conversationId: string, message: string, messageType: string, timestamp: string, status: string }`
 *       - Description: New message received
 *
 *       **userOnline**
 *       - Listen: `userOnline`
 *       - Payload: `{ id: string, username: string, isOnline: boolean }`
 *       - Description: User came online
 *
 *       **userOffline**
 *       - Listen: `userOffline`
 *       - Payload: `{ id: string, username: string, isOnline: boolean, lastSeen: string }`
 *       - Description: User went offline
 *
 *       **userTyping**
 *       - Listen: `userTyping`
 *       - Payload: `{ senderId: string, senderUsername: string, isTyping: boolean }`
 *       - Description: User is typing
 *
 *       **messageRead**
 *       - Listen: `messageRead`
 *       - Payload: `{ messageId: string, readBy: string, readAt: string }`
 *       - Description: Message was read
 *
 *       **error**
 *       - Listen: `error`
 *       - Payload: `{ message: string }`
 *       - Description: Error occurred
 *
 *       ## Usage Example
 *       ```javascript
 *       const socket = io('http://localhost:1500');
 *
 *       // Authenticate
 *       socket.emit('authenticate', { username: 'john' });
 *
 *       // Listen for authentication confirmation
 *       socket.on('authenticated', (data) => {
 *         console.log('Authenticated:', data.user);
 *         console.log('Online users:', data.onlineUsers);
 *       });
 *
 *       // Send message
 *       socket.emit('sendDirectMessage', {
 *         recipientId: 'user123',
 *         message: 'Hello!'
 *       });
 *
 *       // Listen for new messages
 *       socket.on('newDirectMessage', (message) => {
 *         console.log('New message:', message);
 *       });
 *       ```
 *     tags:
 *       - WebSocket
 *     responses:
 *       101:
 *         description: WebSocket connection established
 */
