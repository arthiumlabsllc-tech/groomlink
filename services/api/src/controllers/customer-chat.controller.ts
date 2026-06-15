/**
 * customer-chat.controller.ts
 *
 * Endpoints for authenticated end-users (customers, salon owners, freelancers,
 * partners) to read and send messages on their own support tickets.
 */

import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import * as chatService from '../services/chat.service';
import * as aiAssistant from '../services/ai-assistant.service';
import { TicketSource } from '@prisma/client';

const createTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  initialMessage: z.string().min(1).max(5000),
  source: z.nativeEnum(TicketSource).optional(),
  category: z.string().max(60).optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

export async function getMyTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.supportTicket.count({ where: { userId } }),
    ]);

    const formatted = tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      source: t.source,
      unreadByUser: t.unreadByUser,
      lastMessageAt: t.lastMessageAt.toISOString(),
      lastMessage: t.messages[0]
        ? {
            content: t.messages[0].content,
            isFromUser: t.messages[0].isFromUser,
            createdAt: t.messages[0].createdAt.toISOString(),
          }
        : null,
      assignedTo: t.assignedTo,
    }));

    paginatedResponse(res, formatted, page, limit, total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function getMyTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
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

    if (!ticket || ticket.userId !== userId) {
      errorResponse(res, 'NOT_FOUND', 'Conversation not found', 404);
      return;
    }

    // Mark all agent messages as read by the user.
    await chatService.markRead(id, false);

    successResponse(res, chatService.formatTicketForAgents(ticket));
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function createMyTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const validation = createTicketSchema.safeParse(req.body);
    if (!validation.success) {
      errorResponse(res, 'VALIDATION_ERROR', validation.error.message, 400);
      return;
    }

    const { subject, initialMessage, source, category } = validation.data;

    const ticket = await chatService.createConversation({
      userId,
      subject,
      description: initialMessage.slice(0, 500),
      initialMessage,
      source: source ?? TicketSource.OTHER,
      category,
    });

    // Auto-reply with AI welcome message so user sees it immediately
    try {
      await chatService.appendMessage({
        ticketId: ticket.id,
        content: aiAssistant.getWelcomeMessage(),
        isFromUser: false,
        senderId: null,
      });
    } catch (e) {
      // Non-fatal: welcome message failed but ticket was created
    }

    // Reload ticket with all messages for the response
    const fullTicket = await prisma.supportTicket.findUnique({
      where: { id: ticket.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true } },
      },
    });

    successResponse(res, chatService.formatTicketForAgents(fullTicket), 201);
  } catch (error) {
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 500);
  }
}

export async function sendMyMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const validation = sendMessageSchema.safeParse(req.body);
    if (!validation.success) {
      errorResponse(res, 'VALIDATION_ERROR', validation.error.message, 400);
      return;
    }

    // Verify the ticket belongs to the user.
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      select: { userId: true, status: true },
    });
    if (!ticket || ticket.userId !== userId) {
      errorResponse(res, 'NOT_FOUND', 'Conversation not found', 404);
      return;
    }
    if (ticket.status === 'CLOSED') {
      errorResponse(res, 'CONVERSATION_CLOSED', 'This conversation is closed. Please start a new one.', 400);
      return;
    }

    // AI assistant: analyze the message and respond if it can help
    const aiAnalysis = aiAssistant.analyzeMessage(validation.data.content);

    if (aiAnalysis.shouldAnswer && aiAnalysis.answer) {
      // Save user's message FIRST (so it appears before AI response in chat)
      const userMessage = await chatService.appendMessage({
        ticketId: id,
        content: validation.data.content,
        isFromUser: true,
        senderId: userId,
      });

      // Then AI responds (appears after user's message)
      const aiMessage = await chatService.appendMessage({
        ticketId: id,
        content: aiAnalysis.answer,
        isFromUser: false,
        senderId: null,
      });

      successResponse(res, chatService.formatMessage(aiMessage), 201);
      return;
    }

    // If AI needs escalation, save user message first then handle handoff
    if (aiAnalysis.needsEscalation) {
      const currentTicket = await prisma.supportTicket.findUnique({
        where: { id },
        select: { assignedToId: true },
      });

      // Save user's message first
      const userMessage = await chatService.appendMessage({
        ticketId: id,
        content: validation.data.content,
        isFromUser: true,
        senderId: userId,
      });

      // If no agent is already assigned, try to find and assign one
      if (!currentTicket?.assignedToId) {
        const agentName = await aiAssistant.findAndAssignAgent(id);
        const escalationContent = agentName
          ? aiAssistant.getAgentAssignedMessage(agentName)
          : aiAssistant.getNoAgentAvailableMessage();

        const systemMessage = await chatService.appendMessage({
          ticketId: id,
          content: escalationContent,
          isFromUser: false,
          senderId: null,
        });

        successResponse(res, chatService.formatMessage(systemMessage), 201);
        return;
      }

      // Agent already assigned — just save user message
      successResponse(res, chatService.formatMessage(userMessage), 201);
      return;
    }

    // Save user message normally (no AI match, no escalation)
    const message = await chatService.appendMessage({
      ticketId: id,
      content: validation.data.content,
      isFromUser: true,
      senderId: userId,
    });

    successResponse(res, chatService.formatMessage(message), 201);
  } catch (error) {
    errorResponse(res, 'SEND_FAILED', (error as Error).message, 500);
  }
}
