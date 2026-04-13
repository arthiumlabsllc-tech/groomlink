import { Response } from 'express';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types';
import { SupportTicketStatus, SupportTicketPriority } from '@prisma/client';
import { z } from 'zod';

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

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        type: 'SYSTEM',
        title: 'Support Ticket Updated',
        message: `Your support ticket "${ticket.subject}" status has been updated to ${status.replace('_', ' ')}`,
        data: { ticketId: ticket.id },
      },
    });

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
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!ticket) {
      errorResponse(res, 'NOT_FOUND', 'Support ticket not found', 404);
      return;
    }

    // Create the message
    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        senderId,
        content,
        isFromUser: false,
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

    // Update ticket status to IN_PROGRESS if it's OPEN
    if (ticket.status === 'OPEN') {
      await prisma.supportTicket.update({
        where: { id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        type: 'SYSTEM',
        title: 'New Support Message',
        message: `You have a new message on your support ticket "${ticket.subject}"`,
        data: { ticketId: ticket.id },
      },
    });

    successResponse(res, {
      id: message.id,
      content: message.content,
      isFromUser: message.isFromUser,
      createdAt: message.createdAt.toISOString(),
      sender: message.sender,
    });
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

    // Create notification for user if assigned
    if (assignedToId) {
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
