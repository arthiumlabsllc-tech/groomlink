import { Router } from 'express';
import * as aiAccountantController from '../controllers/ai-accountant.controller';
import { authenticateToken, requireAdminOrHigher } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';

const router = Router();

// All AI Accountant endpoints require admin+ with the 'dashboard' permission
router.use(authenticateToken, requireAdminOrHigher, requirePermission('dashboard'));

// Configuration status (is OpenAI configured?)
router.get('/status', aiAccountantController.getStatus);

// Conversational Q&A over live financial data
router.post('/chat', aiAccountantController.chat);

// On-demand financial reports (markdown)
router.post('/report', aiAccountantController.generateReport);

// Anomaly alerts
router.get('/alerts', aiAccountantController.listAlerts);
router.post('/alerts/scan', aiAccountantController.triggerScan);
router.patch('/alerts/:id', aiAccountantController.updateAlert);

export default router;
