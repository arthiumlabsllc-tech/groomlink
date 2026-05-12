import { Response } from 'express';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types';
import { SupportTicketStatus, SupportTicketPriority } from '@prisma/client';
import { z } from 'zod';
import * as chatService from '../services/chat.service';

const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
});

const sendMessageSchema = z.object({
  content: z.string().min(1),
});

const assignTicketSchema = z.object({
  assignedToId: z.string().optional(),
});

// Get all support tickets with pagination and filters
export async function getAllTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as SupportTicketStatus | undefined;
    const priority = req.query.priority as SupportTicketPriority | undefined;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (priority) {
      where.priority = priority;
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    // Format tickets to match frontend expectations
    const formattedTickets = tickets.map(ticket => ({
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      user: ticket.user,
      assignedTo: ticket.assignedTo,
      messageCount: ticket._count.messages,
    }));

    paginatedResponse(res, formattedTickets, page, limit, total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

// Get ticket by ID with messages
export async function getTicketById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      errorResponse(res, 'NOT_FOUND', 'Support ticket not found', 404);
      return;
    }

    // Format messages to match frontend expectations
    const formattedMessages = ticket.messages.map(message => ({
      id: message.id,
      content: message.content,
      isFromUser: message.isFromUser,
      createdAt: message.createdAt.toISOString(),
      sender: message.sender,
    }));

    successResponse(res, {
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      user: ticket.user,
      guestName: ticket.guestName,
      guestEmail: ticket.guestEmail,
      assignedTo: ticket.assignedTo,
      messages: formattedMessages,
    });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

// Update ticket status
export async function updateTicketStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const validation = updateStatusSchema.safeParse(req.body);

    if (!validation.success) {
      errorResponse(res, 'VALIDATION_ERROR', validation.error.message, 400);
      return;
    }

    const { status } = validation.data;

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Create notification for user (skip for guest tickets)
    if (ticket.userId) {
      await prisma.notification.create({
        data: {
          userId: ticket.userId,
          type: 'SYSTEM',
          title: 'Support Ticket Updated',
          message: `Your support ticket "${ticket.subject}" status has been updated to ${status.replace('_', ' ')}`,
          data: { ticketId: ticket.id },
        },
      });
    }

    // Format messages to match frontend expectations
    const formattedMessages = ticket.messages.map(message => ({
      id: message.id,
      content: message.content,
      isFromUser: message.isFromUser,
      createdAt: message.createdAt.toISOString(),
      sender: message.sender,
    }));

    successResponse(res, {
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      user: ticket.user,
      assignedTo: ticket.assignedTo,
      messages: formattedMessages,
    });
  } catch (error) {
    if ((error as any).code === 'P2025') {
      errorResponse(res, 'NOT_FOUND', 'Support ticket not found', 404);
      return;
    }
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

// Send message to ticket (admin/staff response)
export async function sendTicketMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const validation = sendMessageSchema.safeParse(req.body);

    if (!validation.success) {
      errorResponse(res, 'VALIDATION_ERROR', validation.error.message, 400);
      return;
    }

    const { content } = validation.data;
    const senderId = req.user!.id;

    // Check if ticket exists
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!ticket) {
      errorResponse(res, 'NOT_FOUND', 'Support ticket not found', 404);
      return;
    }

    // Route through the central chat service so the message is broadcast to
    // the ticket room, the user room, the support room, and triggers the
    // offline-email fallback. The service also handles status promotion,
    // unread counters, and the customer Notification row.
    const message = await chatService.appendMessage({
      ticketId: id,
      content,
      isFromUser: false,
      senderId,
    });

    // Mark messages from the user as read by the agent.
    await chatService.markRead(id, true);

    successResponse(res, chatService.formatMessage(message));
  } catch (error) {
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 500);
  }
}

// Assign ticket to staff member
export async function assignTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const validation = assignTicketSchema.safeParse(req.body);

    if (!validation.success) {
      errorResponse(res, 'VALIDATION_ERROR', validation.error.message, 400);
      return;
    }

    const { assignedToId } = validation.data;

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: { assignedToId: assignedToId || null },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Create notification for user if assigned (skip for guest tickets)
    if (assignedToId && ticket.userId) {
      await prisma.notification.create({
        data: {
          userId: ticket.userId,
          type: 'SYSTEM',
          title: 'Support Ticket Assigned',
          message: `Your support ticket "${ticket.subject}" has been assigned to a support agent`,
          data: { ticketId: ticket.id },
        },
      });
    }

    // Format messages to match frontend expectations
    const formattedMessages = ticket.messages.map(message => ({
      id: message.id,
      content: message.content,
      isFromUser: message.isFromUser,
      createdAt: message.createdAt.toISOString(),
      sender: message.sender,
    }));

    successResponse(res, {
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      user: ticket.user,
      assignedTo: ticket.assignedTo,
      messages: formattedMessages,
    });
  } catch (error) {
    if ((error as any).code === 'P2025') {
      errorResponse(res, 'NOT_FOUND', 'Support ticket not found', 404);
      return;
    }
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

// Get ticket messages
export async function getTicketMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if ticket exists
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      errorResponse(res, 'NOT_FOUND', 'Support ticket not found', 404);
      return;
    }

    const messages = await prisma.ticketMessage.findMany({
      where: { ticketId: id },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Format messages to match frontend expectations
    const formattedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      isFromUser: message.isFromUser,
      createdAt: message.createdAt.toISOString(),
      sender: message.sender,
    }));

    successResponse(res, { messages: formattedMessages });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

// Get current agent's profile with settings
export async function getAgentProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      errorResponse(res, 'NOT_FOUND', 'User not found', 404);
      return;
    }

    const settings = await prisma.agentSettings.findUnique({
      where: { userId },
    });

    successResponse(res, {
      user,
      settings: settings || {
        emailNotifications: true,
        soundNotifications: true,
        desktopNotifications: true,
        status: 'ONLINE',
        awayMessage: null,
        autoAssign: true,
      },
    });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

// Update agent profile (firstName, lastName, avatar)
export async function updateAgentProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { firstName, lastName, avatar } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(avatar !== undefined && { avatar }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        role: true,
      },
    });

    successResponse(res, { user: updatedUser });
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

// Update agent notification settings
export async function updateAgentSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { emailNotifications, soundNotifications, desktopNotifications, autoAssign } = req.body;

    const settings = await prisma.agentSettings.upsert({
      where: { userId },
      create: {
        userId,
        emailNotifications: emailNotifications ?? true,
        soundNotifications: soundNotifications ?? true,
        desktopNotifications: desktopNotifications ?? true,
        autoAssign: autoAssign ?? true,
      },
      update: {
        ...(emailNotifications !== undefined && { emailNotifications }),
        ...(soundNotifications !== undefined && { soundNotifications }),
        ...(desktopNotifications !== undefined && { desktopNotifications }),
        ...(autoAssign !== undefined && { autoAssign }),
      },
    });

    successResponse(res, { settings });
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

// Update agent status (online/away/offline)
export async function updateAgentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { status, awayMessage } = req.body;

    if (!['ONLINE', 'AWAY', 'OFFLINE'].includes(status)) {
      errorResponse(res, 'INVALID_STATUS', 'Status must be ONLINE, AWAY, or OFFLINE', 400);
      return;
    }

    const settings = await prisma.agentSettings.upsert({
      where: { userId },
      create: {
        userId,
        status,
        awayMessage: awayMessage || null,
      },
      update: {
        status,
        ...(awayMessage !== undefined && { awayMessage }),
      },
    });

    successResponse(res, { settings });
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}
