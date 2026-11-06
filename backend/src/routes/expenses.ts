import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, AuthRequest } from '../middlewares/auth';

const router = Router();

// GET /api/expenses
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { category, startDate, endDate, userId } = req.query;
    const where: any = {};

    if (category && category !== 'ALL') {
      where.category = String(category);
    }

    // Separate expenses per operator; owner/admin can view all or filter by operator
    const isOperator = req.user!.role === 'OPERATOR';
    if (isOperator) {
      where.userId = req.user!.userId;
    } else if (userId && userId !== 'ALL') {
      where.userId = String(userId);
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        user: { select: { username: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Group by category for summary
    const byCategory: { [key: string]: number } = {};
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
    }

    return res.json({
      expenses,
      totalAmount,
      byCategory,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/expenses
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { category, description, amount, paymentMethod = 'CASH', reference } = req.body;

    if (!category || !description || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Category, description and valid amount are required' });
    }

    const expense = await prisma.expense.create({
      data: {
        category,
        description,
        amount: Number(amount),
        paymentMethod,
        reference: reference || null,
        userId: req.user!.userId,
      },
      include: {
        user: { select: { username: true, fullName: true } },
      },
    });

    // Record audit event
    await prisma.auditEvent.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE_EXPENSE',
        entity: 'Expense',
        entityId: expense.id,
        details: { category, amount: Number(amount), description },
      },
    });

    return res.json(expense);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
