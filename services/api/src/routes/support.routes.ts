import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import * as supportTicketController from '../controllers/support-ticket.controller';
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

export default router;
