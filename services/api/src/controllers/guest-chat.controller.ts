/**
 * guest-chat.controller.ts
 *
 * Endpoints for anonymous landing-page visitors who want to talk to support
 * before/without creating an account. The flow:
 *   1. Visitor submits { name, email, initialMessage } -> we create a guest
 *      SupportTicket (userId = null, guestEmail/guestName populated) and
 *      return a short-lived JWT scoped to that ticket id.
 *   2. Browser stores { ticketId, guestToken } in localStorage.
 *   3. Subsequent reads/sends authenticate with the guest token.
 *   4. Email fallback ensures replies still reach the visitor if they close
 *      the page before an agent answers.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';
import * as chatService from '../services/chat.service';
import { TicketSource } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const GUEST_TOKEN_TTL = '14d';

const createGuestSchema = z.object({
  guestName: z.string().min(1).max(120),
  guestEmail: z.string().email().max(180),
  message: z.string().min(1).max(5000),
  subject: z.string().max(200).optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

export interface GuestRequest extends Request {
  guestTicketId?: string;
}

export function signGuestToken(ticketId: string, guestEmail: string): string {
  return jwt.sign({ kind: 'guest-chat', ticketId, guestEmail }, JWT_SECRET, {
    expiresIn: GUEST_TOKEN_TTL,
  });
}

/**
 * Middleware: extracts and validates a guest chat token from the Authorization
 * header. Sets req.guestTicketId on success.
 */
export function requireGuestTicketToken(
  req: GuestRequest,
  res: Response,
  next: () => void,
): void {
  const auth = req.headers['authorization'];
  const token = auth && auth.split(' ')[1];
  if (!token) {
    errorResponse(res, 'UNAUTHORIZED', 'Guest token required', 401);
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.kind !== 'guest-chat' || !decoded.ticketId) {
      errorResponse(res, 'INVALID_TOKEN', 'Invalid guest chat token', 401);
      return;
    }
    if (decoded.ticketId !== req.params.id) {
      errorResponse(res, 'FORBIDDEN', 'Token does not match this conversation', 403);
      return;
    }
    req.guestTicketId = decoded.ticketId;
    next();
  } catch {
    errorResponse(res, 'INVALID_TOKEN', 'Invalid or expired guest token', 401);
  }
}

export async function createGuestTicket(req: Request, res: Response): Promise<void> {
  try {
    const validation = createGuestSchema.safeParse(req.body);
    if (!validation.success) {
      errorResponse(res, 'VALIDATION_ERROR', validation.error.message, 400);
      return;
    }
    const { guestName, guestEmail, message, subject } = validation.data;

    // Block known-bad emails up-front.
    const banned = await prisma.bannedEmail.findUnique({
      where: { email: guestEmail.toLowerCase() },
    });
    if (banned) {
      errorResponse(res, 'EMAIL_BANNED', 'This email cannot start a support conversation', 403);
      return;
    }

    const ticket = await chatService.createConversation({
      userId: null,
      subject: subject || `Chat from ${guestName}`,
      description: message.slice(0, 500),
      initialMessage: message,
      source: TicketSource.LANDING,
      guestEmail: guestEmail.toLowerCase(),
      guestName,
    });

    const guestToken = signGuestToken(ticket.id, guestEmail.toLowerCase());

    successResponse(
      res,
      {
        ticket: chatService.formatTicketForAgents(ticket),
        guestToken,
      },
      201,
    );
  } catch (error) {
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 500);
  }
}

export async function getGuestMessages(req: GuestRequest, res: Response): Promise<void> {
  try {
    const ticketId = req.guestTicketId!;
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!ticket) {
      errorResponse(res, 'NOT_FOUND', 'Conversation not found', 404);
      return;
    }
    await chatService.markRead(ticketId, false);
    successResponse(res, chatService.formatTicketForAgents(ticket));
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function sendGuestMessage(req: GuestRequest, res: Response): Promise<void> {
  try {
    const ticketId = req.guestTicketId!;
    const validation = sendMessageSchema.safeParse(req.body);
    if (!validation.success) {
      errorResponse(res, 'VALIDATION_ERROR', validation.error.message, 400);
      return;
    }
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { status: true },
    });
    if (!ticket) {
      errorResponse(res, 'NOT_FOUND', 'Conversation not found', 404);
      return;
    }
    if (ticket.status === 'CLOSED') {
      errorResponse(res, 'CONVERSATION_CLOSED', 'This conversation is closed', 400);
      return;
    }
    const message = await chatService.appendMessage({
      ticketId,
      content: validation.data.content,
      isFromUser: true,
      senderId: null,
    });
    successResponse(res, chatService.formatMessage(message), 201);
  } catch (error) {
    errorResponse(res, 'SEND_FAILED', (error as Error).message, 500);
  }
}
