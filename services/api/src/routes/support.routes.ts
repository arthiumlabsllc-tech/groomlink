import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import * as supportTicketController from '../controllers/support-ticket.controller';
import * as chatService from '../services/chat.service';
import { authenticateToken, requireSupportOrHigher } from '../middleware/auth';

const router = Router();

// Support dashboard stats
router.get('/stats', authenticateToken, requireSupportOrHigher, async (req, res) => {
  try {
    const prisma = (await import('../config/database')).default;
    
    const [
      totalUsers,
      totalSalons,
      activeBookings,
      openTickets,
      todaySignups,
      pendingSalons,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.salon.count(),
      prisma.booking.count({ where: { status: { in: ['CONFIRMED', 'IN_PROGRESS'] } } }),
      prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.user.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      prisma.salon.count({ where: { status: 'PENDING' } }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalSalons,
        activeBookings,
        openTickets,
        todaySignups,
        pendingSalons,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// Support staff can create customers
// This route allows SUPPORT, ADMIN, and SUPER_ADMIN roles
router.post('/customers', authenticateToken, requireSupportOrHigher, adminController.adminCreateCustomer);

// Support user listing - see ALL users except SUPER_ADMIN
router.get('/users', authenticateToken, requireSupportOrHigher, async (req, res) => {
  try {
    const prisma = (await import('../config/database')).default;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const role = req.query.role as string | undefined;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    // Exclude SUPER_ADMIN from listing
    const where: any = {
      role: { not: 'SUPER_ADMIN' },
    };

    // Filter by role if specified
    if (role && role !== 'ALL') {
      where.role = role;
    }

    // Filter by status if specified
    if (status) {
      where.status = status;
    }

    // Search by name, phone, or email
    if (search && search.trim()) {
      const searchTerm = search.trim();
      // If we already have a role filter, preserve it
      const roleCondition = where.role;
      where.role = undefined; // Clear to use OR with AND
      where.AND = [
        { role: roleCondition || { not: 'SUPER_ADMIN' } },
        {
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { phoneNumber: { contains: searchTerm } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          email: true,
          role: true,
          status: true,
          isVerified: true,
          createdAt: true,
          lastLoginAt: true,
          salons: {
            select: { id: true, businessName: true, status: true, providerCategory: true },
            take: 5,
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// Support salon listing - see ALL statuses (not just APPROVED like the public endpoint)
router.get('/salons', authenticateToken, requireSupportOrHigher, async (req, res) => {
  try {
    const prisma = (await import('../config/database')).default;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [salons, total] = await Promise.all([
      prisma.salon.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, phoneNumber: true, email: true } }
        }
      }),
      prisma.salon.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);
    res.json({
      success: true,
      data: salons,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// Support ticket management (SUPPORT+ role)
router.get('/tickets', authenticateToken, requireSupportOrHigher, supportTicketController.getAllTickets);
router.get('/tickets/:id', authenticateToken, requireSupportOrHigher, supportTicketController.getTicketById);
router.put('/tickets/:id/status', authenticateToken, requireSupportOrHigher, supportTicketController.updateTicketStatus);
router.post('/tickets/:id/messages', authenticateToken, requireSupportOrHigher, supportTicketController.sendTicketMessage);
router.get('/tickets/:id/messages', authenticateToken, requireSupportOrHigher, supportTicketController.getTicketMessages);
router.put('/tickets/:id/assign', authenticateToken, requireSupportOrHigher, supportTicketController.assignTicket);

// Live chat thread list (sorted by lastMessageAt) for the agent dashboard
router.get('/chat/threads', authenticateToken, requireSupportOrHigher, async (req, res) => {
  try {
    const prisma = (await import('../config/database')).default;
    const { source, status, q } = req.query as Record<string, string | undefined>;

    const where: any = {};
    if (source && source !== 'ALL') where.source = source;
    if (status && status !== 'ALL') where.status = status;
    if (q && q.trim()) {
      const term = q.trim();
      where.OR = [
        { subject: { contains: term, mode: 'insensitive' } },
        { guestName: { contains: term, mode: 'insensitive' } },
        { guestEmail: { contains: term, mode: 'insensitive' } },
        { user: { firstName: { contains: term, mode: 'insensitive' } } },
        { user: { lastName: { contains: term, mode: 'insensitive' } } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    res.json({
      success: true,
      data: tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        source: t.source,
        unreadByAgent: t.unreadByAgent,
        unreadByUser: t.unreadByUser,
        lastMessageAt: t.lastMessageAt.toISOString(),
        createdAt: t.createdAt.toISOString(),
        guestName: t.guestName,
        guestEmail: t.guestEmail,
        user: t.user,
        lastMessage: t.messages[0]
          ? {
              content: t.messages[0].content,
              isFromUser: t.messages[0].isFromUser,
              createdAt: t.messages[0].createdAt.toISOString(),
            }
          : null,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// Mark a thread read on the agent side (resets unreadByAgent counter)
router.post('/chat/threads/:id/read', authenticateToken, requireSupportOrHigher, async (req, res) => {
  try {
    await chatService.markRead(req.params.id, true);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

export default router;
