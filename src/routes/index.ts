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
 */

/**
 * @openapi
 * security:
 *   - bearerAuth: []
 */
