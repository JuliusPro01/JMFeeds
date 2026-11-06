import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, AuthRequest } from '../middlewares/auth';

const router = Router();

// Helper function to scan inventory and debts, creating alerts if missing
export async function runNotificationScan() {
  try {
    const settings = await prisma.businessSettings.findFirst();
    const expiryDays = settings?.expiryAlertDays ?? 30;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const products = await prisma.product.findMany({ where: { isActive: true } });
    const created: string[] = [];

    for (const p of products) {
      const stock = Number(p.stockQuantity);
      const threshold = Number(p.minStockThreshold);

      // Low stock alert: avoid recreating an alert if one was already generated within the last 24 hours
      if (stock <= threshold) {
        const existing = await prisma.notification.findFirst({
          where: {
            title: 'Low Stock Alert',
            message: { contains: p.name },
            createdAt: { gte: oneDayAgo },
          },
        });
        if (!existing) {
          await prisma.notification.create({
            data: {
              title: 'Low Stock Alert',
              message: `${p.name} is running low (${stock} ${p.unit} remaining).`,
              type: stock === 0 ? 'DANGER' : 'WARNING',
              link: '/inventory',
            },
          });
          created.push(p.name);
        }
      }

      // Expiry alert: avoid recreating if generated in the last 24 hours
      if (p.expiryDate) {
        const days = (new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
        if (days <= expiryDays) {
          const existing = await prisma.notification.findFirst({
            where: {
              title: 'Expiry Alert',
              message: { contains: p.name },
              createdAt: { gte: oneDayAgo },
            },
          });
          if (!existing) {
            await prisma.notification.create({
              data: {
                title: 'Expiry Alert',
                message: `${p.name} ${days < 0 ? 'has expired' : `expires in ${Math.ceil(days)} days`}.`,
                type: days < 0 ? 'DANGER' : 'WARNING',
                link: '/inventory',
              },
            });
            created.push(p.name);
          }
        }
      }
    }

    // Overdue debts: avoid recreating if generated in the last 24 hours
    const customers = await prisma.customer.findMany({
      where: { outstandingDebt: { gt: 0 }, isActive: true },
    });
    for (const c of customers) {
      const existing = await prisma.notification.findFirst({
        where: {
          title: 'Overdue Debt Notice',
          message: { contains: c.name },
          createdAt: { gte: oneDayAgo },
        },
      });
      if (!existing) {
        await prisma.notification.create({
          data: {
            title: 'Overdue Debt Notice',
            message: `${c.name} has an outstanding debt of KSh ${Number(c.outstandingDebt).toLocaleString()}.`,
            type: 'WARNING',
            link: '/debts',
          },
        });
        created.push(c.name);
      }
    }

    return created;
  } catch (err) {
    console.error('Notification scan error:', err);
    return [];
  }
}

// GET /api/notifications
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Run automated scan so alerts are fresh
    await runNotificationScan();

    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return res.json({ notifications, unreadCount });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/:id/read
router.post('/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    return res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/scan (Generate low-stock / expiry / overdue-debt alerts, avoiding duplicates)
router.post('/scan', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.businessSettings.findFirst();
    const expiryDays = settings?.expiryAlertDays ?? 30;

    const products = await prisma.product.findMany({ where: { isActive: true } });
    const created: string[] = [];

    for (const p of products) {
      const stock = Number(p.stockQuantity);
      const threshold = Number(p.minStockThreshold);

      // Low stock alert avoid duplicates for the same unresolved product
      if (stock <= threshold) {
        const existing = await prisma.notification.findFirst({
          where: {
            title: 'Low Stock Alert',
            message: { contains: p.name },
            isRead: false,
          },
        });
        if (!existing) {
          await prisma.notification.create({
            data: {
              title: 'Low Stock Alert',
              message: `${p.name} is running low (${stock} ${p.unit} remaining).`,
              type: stock === 0 ? 'DANGER' : 'WARNING',
              link: '/inventory',
            },
          });
          created.push(p.name);
        }
      }

      // Expiry alert
      if (p.expiryDate) {
        const days = (new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
        if (days <= expiryDays) {
          const existing = await prisma.notification.findFirst({
            where: {
              title: 'Expiry Alert',
              message: { contains: p.name },
              isRead: false,
            },
          });
          if (!existing) {
            await prisma.notification.create({
              data: {
                title: 'Expiry Alert',
                message: `${p.name} ${days < 0 ? 'has expired' : `expires in ${Math.ceil(days)} days`}.`,
                type: days < 0 ? 'DANGER' : 'WARNING',
                link: '/inventory',
              },
            });
            created.push(p.name);
          }
        }
      }
    }

    // Overdue debts
    const customers = await prisma.customer.findMany({
      where: { outstandingDebt: { gt: 0 }, isActive: true },
    });
    for (const c of customers) {
      const existing = await prisma.notification.findFirst({
        where: {
          title: 'Overdue Debt Notice',
          message: { contains: c.name },
          isRead: false,
        },
      });
      if (!existing) {
        await prisma.notification.create({
          data: {
            title: 'Overdue Debt Notice',
            message: `${c.name} has an outstanding debt of KSh ${Number(c.outstandingDebt).toLocaleString()}.`,
            type: 'WARNING',
            link: '/debts',
          },
        });
        created.push(c.name);
      }
    }

    return res.json({ created, count: created.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
