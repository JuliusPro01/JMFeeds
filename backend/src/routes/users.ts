import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { authenticateToken, requireOwner, AuthRequest } from '../middlewares/auth';

const router = Router();

// GET /api/users (Owner only)
router.get('/', authenticateToken, requireOwner, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        fullName: true,
        role: true,
        isActive: true,
        permissions: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return res.json(users);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/users (Add operator — Owner only)
router.post('/', authenticateToken, requireOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, phone, password, fullName, role = 'OPERATOR', permissions } = req.body;
    if (!username || !password || !fullName) {
      return res.status(400).json({ error: 'Username, password and full name are required' });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(400).json({ error: 'Username already exists' });

    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (existingEmail) return res.status(400).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        email: email ? email.toLowerCase() : null,
        phone: phone || null,
        passwordHash,
        fullName,
        role,
        permissions: permissions || { canSell: true, canAddCustomer: true, canRecordCredit: true },
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        fullName: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
      },
    });

    await prisma.auditEvent.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE_USER',
        entity: 'User',
        entityId: user.id,
        details: { username, role, email },
      },
    });

    return res.json(user);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/users/:id (Update role/status/permissions — Owner only)
router.put('/:id', authenticateToken, requireOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, role, isActive, permissions } = req.body;

    // Prevent deactivating yourself or the last owner
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'User not found' });

    if (target.role === 'OWNER' && isActive === false) {
      return res.status(400).json({ error: 'Cannot deactivate an owner account' });
    }

    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email: email.toLowerCase(), NOT: { id } },
      });
      if (existing) return res.status(400).json({ error: 'Email already in use' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        fullName: fullName !== undefined ? fullName : undefined,
        email: email !== undefined ? (email ? email.toLowerCase() : null) : undefined,
        phone: phone !== undefined ? phone : undefined,
        role: role !== undefined ? role : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        permissions: permissions !== undefined ? permissions : undefined,
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        fullName: true,
        role: true,
        isActive: true,
        permissions: true,
      },
    });

    await prisma.auditEvent.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE_USER',
        entity: 'User',
        entityId: id,
        details: { changes: { fullName, role, isActive, permissions } },
      },
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/users/:id/reset-password (Owner only)
router.post('/:id/reset-password', authenticateToken, requireOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });

    await prisma.auditEvent.create({
      data: {
        userId: req.user!.userId,
        action: 'RESET_PASSWORD',
        entity: 'User',
        entityId: id,
        details: {},
      },
    });

    return res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/users/:id (Smart delete: permanent if zero transactions, deactivate if has history)
router.delete('/:id', authenticateToken, requireOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (id === req.user!.userId) {
      return res.status(400).json({ error: 'You cannot delete your own logged-in account' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            sales: true,
            expenses: true,
            dailyClosings: true,
            purchases: true,
            debtRepayments: true,
            stockAdjustments: true,
          },
        },
      },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === 'OWNER') {
      return res.status(400).json({ error: 'Owner accounts cannot be deleted' });
    }

    const hasHistory =
      targetUser._count.sales > 0 ||
      targetUser._count.expenses > 0 ||
      targetUser._count.dailyClosings > 0 ||
      targetUser._count.purchases > 0 ||
      targetUser._count.debtRepayments > 0 ||
      targetUser._count.stockAdjustments > 0;

    if (hasHistory) {
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      await prisma.auditEvent.create({
        data: {
          userId: req.user!.userId,
          action: 'DEACTIVATE_USER',
          entity: 'User',
          entityId: id,
          details: { username: targetUser.username, fullName: targetUser.fullName, reason: 'Has transaction history, deactivated' },
        },
      });

      return res.json({
        action: 'DEACTIVATED',
        message: `User "${targetUser.fullName}" has recorded financial transactions (sales/expenses/closings) and was safely deactivated to preserve audit history.`,
      });
    } else {
      await prisma.auditEvent.deleteMany({ where: { userId: id } });
      await prisma.user.delete({ where: { id } });

      await prisma.auditEvent.create({
        data: {
          userId: req.user!.userId,
          action: 'DELETE_USER',
          entity: 'User',
          entityId: id,
          details: { username: targetUser.username, fullName: targetUser.fullName, reason: 'Zero history, permanently deleted' },
        },
      });

      return res.json({
        action: 'DELETED',
        message: `User "${targetUser.fullName}" had no transaction history and was permanently deleted.`,
      });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
