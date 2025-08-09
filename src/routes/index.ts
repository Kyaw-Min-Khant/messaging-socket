import { Router } from 'express';
import authRoutes from './auth';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
router.use('/auth', authRoutes);

// TODO: Add more routes
// router.use('/users', userRoutes);
// router.use('/conversations', conversationRoutes);
// router.use('/messages', messageRoutes);
// router.use('/upload', uploadRoutes);

export default router;