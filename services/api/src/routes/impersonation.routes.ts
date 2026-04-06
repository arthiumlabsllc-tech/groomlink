import { Router, Router as RouterType } from 'express';
import { authenticateToken, requireSupportOrHigher } from '../middleware/auth';
import impersonationController from '../controllers/impersonation.controller';

const router: RouterType = Router();

// All impersonation routes require authentication and support+ role
router.use(authenticateToken);
router.use(requireSupportOrHigher);

/**
 * @route POST /api/impersonation/start
 * @desc Start impersonating a user (support staff only)
 * @access Support, Admin, SuperAdmin
 */
router.post('/start', impersonationController.startImpersonation.bind(impersonationController));

/**
 * @route POST /api/impersonation/end
 * @desc End impersonation session
 * @access Support, Admin, SuperAdmin
 */
router.post('/end', impersonationController.endImpersonation.bind(impersonationController));

/**
 * @route GET /api/impersonation/logs
 * @desc Get impersonation history
 * @access Support, Admin, SuperAdmin
 */
router.get('/logs', impersonationController.getImpersonationLogs.bind(impersonationController));

/**
 * @route GET /api/impersonation/search
 * @desc Search for users to impersonate
 * @access Support, Admin, SuperAdmin
 */
router.get('/search', impersonationController.searchUsers.bind(impersonationController));

/**
 * @route GET /api/impersonation/dashboards/:userId
 * @desc Get dashboard access URLs for a user
 * @access Support, Admin, SuperAdmin
 */
router.get('/dashboards/:userId', impersonationController.getDashboardAccess.bind(impersonationController));

export default router;
