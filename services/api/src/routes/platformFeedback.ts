import { Router } from 'express';
import {
  submitFeedback,
  getAllFeedback,
  getFeedbackStats,
  updateFeedbackStatus,
} from '../controllers/platformFeedbackController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Public route - anyone can submit feedback (authenticated or anonymous)
router.post('/feedback', authenticateToken, submitFeedback);

// Admin-only routes
router.get('/feedback', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), getAllFeedback);
router.get('/feedback/stats', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), getFeedbackStats);
router.patch('/feedback/:id', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), updateFeedbackStatus);

export default router;
