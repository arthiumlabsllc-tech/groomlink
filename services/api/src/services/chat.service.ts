/**
 * chat.service.ts
 *
 * Central business logic for live-chat conversations built on top of the
 * existing SupportTicket / TicketMessage models.
 *
 * Every message goes through `appendMessage()` which:
 *   1. Persists the TicketMessage row
 *   2. Updates ticket.lastMessageAt + the appropriate unread counter
 *   3. Broadcasts via Socket.io to user/support/ticket rooms
 *   4. Triggers an offline-email fallback (best-effort) if the receiver is
 *      not connected to the WebSocket.
 */

import prisma from '../config/database';
import logger from '../config/logger';
import {
  emitToUser,
  emitToSupport,
  emitToTicket,
  isUserOnline,
} from '../config/socket';
import { TicketSource } from '@prisma/client';
import { sendChatReplyEmail } from './email.service';
import { createNotification } from './notification.service';

export interface AppendMessageInput {
  ticketId: string;
  content: string;
  isFromUser: boolean;
  senderId: string | null;
}

export interface CreateTicketInput {
  userId: string | null;
  subject: string;
  description: string;
  initialMessage: string;
  source: TicketSource;
  guestEmail?: string;
  guestName?: string;
  category?: string;
}

const TICKET_EVENT_NEW = 'chat:ticket:created';
const MESSAGE_EVENT = 'chat:message:new';

export async function createConversation(input: CreateTicketInput) {
  const ticket = await prisma.supportTicket.create({
    data: {
      subject: input.subject,
      description: input.description,
      source: input.source,
      category: input.category,
      userId: input.userId ?? undefined,
      guestEmail: input.guestEmail,
      guestName: input.guestName,
      lastMessageAt: new Date(),
      unreadByAgent: 1,
      unreadByUser: 0,
      messages: {
        create: {
          content: input.initialMessage,
          isFromUser: true,
          senderId: input.userId ?? undefined,
        },
      },
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  // Notify all online support agents that a new conversation arrived.
  emitToSupport(TICKET_EVENT_NEW, formatTicketForAgents(ticket));
  // Also broadcast as a message event so any open agent thread refreshes.
  if (ticket.messages[0]) {
    emitToSupport(MESSAGE_EVENT, {
      ticketId: ticket.id,
      message: formatMessage(ticket.messages[0]),
    });
  }

  return ticket;
}

export async function appendMessage(input: AppendMessageInput) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: input.ticketId },
    select: {
      id: true,
      userId: true,
      guestEmail: true,
      guestName: true,
      subject: true,
      status: true,
      user: { select: { email: true, firstName: true } },
    },
  });
  if (!ticket) {
    throw new Error('Ticket not found');
  }

  const message = await prisma.ticketMessage.create({
    data: {
      ticketId: input.ticketId,
      content: input.content,
      isFromUser: input.isFromUser,
      senderId: input.senderId ?? undefined,
    },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
    },
  });

  // Update ticket counters + lastMessageAt + auto-promote OPEN -> IN_PROGRESS
  // when an agent replies.
  await prisma.supportTicket.update({
    where: { id: input.ticketId },
    data: {
      lastMessageAt: new Date(),
      ...(input.isFromUser
        ? { unreadByAgent: { increment: 1 } }
        : { unreadByUser: { increment: 1 } }),
      ...(ticket.status === 'OPEN' && !input.isFromUser ? { status: 'IN_PROGRESS' } : {}),
    },
  });

  const formatted = formatMessage(message);

  // Broadcast to ticket room (anyone currently viewing the thread).
  emitToTicket(input.ticketId, MESSAGE_EVENT, { ticketId: input.ticketId, message: formatted });

  // Build a short "who replied" label for emails / notifications.
  const agentName = (() => {
    const s = (message as any).sender;
    if (s && (s.firstName || s.lastName)) {
      return `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || 'Support';
    }
    return 'GroomLink Support';
  })();

  if (input.isFromUser) {
    // Notify the support inbox that this conversation has new activity.
    emitToSupport(MESSAGE_EVENT, { ticketId: input.ticketId, message: formatted });
  } else if (ticket.userId) {
    // Notify the customer's user-room directly.
    emitToUser(ticket.userId, MESSAGE_EVENT, { ticketId: input.ticketId, message: formatted });

    // Persist a Notification row AND send push notification via notification service
    createNotification({
      userId: ticket.userId,
      type: 'SYSTEM' as any,
      title: 'Support reply',
      message:
        input.content.length > 120
          ? `${input.content.slice(0, 117)}...`
          : input.content,
      data: { ticketId: input.ticketId, kind: 'chat' },
    }).catch((e) => logger.warn('Failed to create chat notification:', e));

    // Email fallback if the user is offline. Best-effort, never blocks.
    if (!isUserOnline(ticket.userId) && ticket.user?.email) {
      sendChatReplyEmail(
        ticket.user.email,
        ticket.user.firstName ?? null,
        ticket.subject,
        agentName,
        input.content,
      ).catch((e) => logger.warn('Failed to send offline chat reply email:', e));
    }
  } else if (ticket.guestEmail) {
    // Guest visitor reply - always email since they have no socket session
    // tied to a userId and will likely have closed the page.
    sendChatReplyEmail(
      ticket.guestEmail,
      ticket.guestName ?? null,
      ticket.subject,
      agentName,
      input.content,
    ).catch((e) => logger.warn('Failed to send guest chat reply email:', e));
  }

  return message;
}

export async function markRead(ticketId: string, byAgent: boolean) {
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: byAgent ? { unreadByAgent: 0 } : { unreadByUser: 0 },
  });
  // Mark all messages from the other side as read.
  await prisma.ticketMessage.updateMany({
    where: {
      ticketId,
      isFromUser: byAgent,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  emitToTicket(ticketId, 'chat:read', { ticketId, byAgent });
}

export function formatMessage(m: any) {
  return {
    id: m.id,
    ticketId: m.ticketId,
    content: m.content,
    isFromUser: m.isFromUser,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
    readAt: m.readAt instanceof Date ? m.readAt.toISOString() : m.readAt ?? null,
    sender: m.sender ? {
      id: m.sender.id,
      firstName: m.sender.firstName,
      lastName: m.sender.lastName,
      avatar: m.sender.avatar ?? null,
    } : null,
  };
}

export function formatTicketForAgents(ticket: any) {
  return {
    id: ticket.id,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    source: ticket.source,
    category: ticket.category,
    createdAt: ticket.createdAt?.toISOString?.() ?? ticket.createdAt,
    updatedAt: ticket.updatedAt?.toISOString?.() ?? ticket.updatedAt,
    lastMessageAt: ticket.lastMessageAt?.toISOString?.() ?? ticket.lastMessageAt,
    unreadByAgent: ticket.unreadByAgent ?? 0,
    unreadByUser: ticket.unreadByUser ?? 0,
    user: ticket.user ?? null,
    guestEmail: ticket.guestEmail ?? null,
    guestName: ticket.guestName ?? null,
    assignedTo: ticket.assignedTo ?? null,
    messages: ticket.messages ? ticket.messages.map(formatMessage) : undefined,
  };
}

/**
 * getBotResponse
 *
 * Matches visitor message against FAQ patterns and returns automated response.
 * Also handles escalation to human agents when visitor requests help or when no match is found.
 */
export async function getBotResponse(message: string, ticketId?: string): Promise<{ response: string | null; shouldEscalate: boolean }> {
  try {
    const faqs = await prisma.fAQBot.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    });

    const lowerMessage = message.toLowerCase();

    for (const faq of faqs) {
      for (const pattern of faq.patterns) {
        if (lowerMessage.includes(pattern.toLowerCase())) {
          // Increment usage count
          await prisma.fAQBot.update({
            where: { id: faq.id },
            data: { usageCount: { increment: 1 } },
          });

          // Check if this should trigger escalation to human agent
          const shouldEscalate = faq.keyword === 'support';

          if (shouldEscalate && ticketId) {
            // Mark ticket for human escalation
            await prisma.supportTicket.update({
              where: { id: ticketId },
              data: { priority: 'HIGH', status: 'OPEN' },
            });

            // Notify agents
            emitToSupport('chat:escalation', { 
              ticketId, 
              reason: 'customer_requested_human',
              message: faq.response 
            });
          }

          return { response: faq.response, shouldEscalate };
        }
      }
    }

    // No match found - escalate to human agent
    if (ticketId) {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { priority: 'HIGH', status: 'OPEN' },
      });

      emitToSupport('chat:escalation', { 
        ticketId, 
        reason: 'no_bot_match',
        message: `Visitor message: "${message}"` 
      });
    }

    return { 
      response: "I'm not sure I understand that question. Let me connect you with a support agent who can help you better. Please hold on...", 
      shouldEscalate: true 
    };
  } catch (error) {
    logger.error('Bot response failed', { error });
    return { response: null, shouldEscalate: false };
  }
}
