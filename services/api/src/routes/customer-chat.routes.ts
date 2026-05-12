/**
 * customer-chat.routes.ts
 *
 * Routes for end-user (authenticated) and guest (anonymous landing) chat.
 * Mounted under /api in src/routes/index.ts.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth';
import * as customerChat from '../controllers/customer-chat.controller';
import * as guestChat from '../controllers/guest-chat.controller';

const router: Router = Router();

// --- Authenticated user routes ----------------------------------
const userMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Slow down a bit and try again.' } },
});

router.get('/me/support/tickets', authenticateToken, customerChat.getMyTickets);
router.post('/me/support/tickets', authenticateToken, userMessageLimiter, customerChat.createMyTicket);
router.get('/me/support/tickets/:id', authenticateToken, customerChat.getMyTicket);
router.post(
  '/me/support/tickets/:id/messages',
  authenticateToken,
  userMessageLimiter,
  customerChat.sendMyMessage,
);

// --- Guest (landing-page anonymous) routes ----------------------
const guestCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many new chats from this address.' } },
});

const guestMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Slow down a bit and try again.' } },
});

router.post('/guest/support/tickets', guestCreateLimiter, guestChat.createGuestTicket);
router.get(
  '/guest/support/tickets/:id',
  guestChat.requireGuestTicketToken,
  guestChat.getGuestMessages,
);
router.post(
  '/guest/support/tickets/:id/messages',
  guestChat.requireGuestTicketToken,
  guestMessageLimiter,
  guestChat.sendGuestMessage,
);

export default router;
