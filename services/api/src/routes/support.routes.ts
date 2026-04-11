import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticateToken, requireSupportOrHigher, UserRole } from '../middleware/auth';

const router = Router();

// Support staff can create customers
// This route allows SUPPORT, ADMIN, and SUPER_ADMIN roles
router.post('/customers', authenticateToken, requireSupportOrHigher, adminController.adminCreateCustomer);

export default router;
