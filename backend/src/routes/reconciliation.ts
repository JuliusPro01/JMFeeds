import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, requireOwner, AuthRequest } from '../middlewares/auth';

const router = Router();

// Helper to parse operator name from structured notes
function parseClosing(c: any) {
  if (!c) return null;
  const match = c.notes ? String(c.notes).match(/^\[Operator:\s*([^\]]+)\]\s*(.*)$/s) : null;
  return {
    ...c,
    operatorName: match ? match[1].trim() : (c.user?.fullName || c.user?.username || 'All Staff'),
    notes: match ? match[2].trim() : (c.notes || ''),
    closedBy: c.user?.fullName || c.user?.username || 'Admin',
  };
}

// GET /api/reconciliation/summary (Owner/Admin only: calculate daily ledger for any date & operator)
router.get('/summary', authenticateToken, requireOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { date, userId } = req.query;
    const targetDate = date ? new Date(String(date)) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const filterUserId = userId && userId !== 'ALL' ? String(userId) : null;

    // 1. Sales strictly within this 24-hour window (past dates never mix with today's sales)
    const salesWhere: any = {
      createdAt: { gte: targetDate, lt: nextDay },
      status: { not: 'CANCELLED' },
    };
    if (filterUserId) {
      salesWhere.userId = filterUserId;
    }

    const sales = await prisma.sale.findMany({
      where: salesWhere,
      include: { payments: true },
    });

    const totalSales = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const creditSales = sales.filter((s) => s.isCredit).reduce((sum, s) => sum + Number(s.balanceDue), 0);

    // Sum payments by method from sales
    let cashFromSales = 0;
    let bankFromSales = 0;
    let otherFromSales = 0;

    for (const sale of sales) {
      for (const p of sale.payments) {
        const amt = Number(p.amount);
        if (p.paymentMethod === 'CASH') cashFromSales += amt;
        else if (p.paymentMethod === 'BANK') bankFromSales += amt;
        else otherFromSales += amt;
      }
    }

    // 2. Debt Repayments collected on this day
    const repaymentsWhere: any = {
      createdAt: { gte: targetDate, lt: nextDay },
    };
    if (filterUserId) {
      repaymentsWhere.userId = filterUserId;
    }

    const repayments = await prisma.debtRepayment.findMany({
      where: repaymentsWhere,
    });

    let cashFromRepayments = 0;
    let bankFromRepayments = 0;
    let otherFromRepayments = 0;
    const totalRepayments = repayments.reduce((sum, r) => sum + Number(r.amount), 0);

    for (const r of repayments) {
      const amt = Number(r.amount);
      if (r.paymentMethod === 'CASH') cashFromRepayments += amt;
      else if (r.paymentMethod === 'BANK') bankFromRepayments += amt;
      else otherFromRepayments += amt;
    }

    // 3. Expenses paid in cash on this day
    const expensesWhere: any = {
      createdAt: { gte: targetDate, lt: nextDay },
    };
    if (filterUserId) {
      expensesWhere.userId = filterUserId;
    }

    const expenses = await prisma.expense.findMany({
      where: expensesWhere,
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const cashExpenses = expenses
      .filter((e) => e.paymentMethod === 'CASH')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const cashCollected = cashFromSales + cashFromRepayments;
    const bankPayments = bankFromSales + bankFromRepayments;
    const otherPayments = otherFromSales + otherFromRepayments;

    // Expected cash in drawer = Cash collected minus cash paid expenses
    const expectedCash = Math.max(0, cashCollected - cashExpenses);

    // Look for existing closing record on this target date
    const closingWhere: any = {
      date: { gte: targetDate, lt: nextDay },
    };
    if (filterUserId) {
      // Find closing that matches this operator tag or user
      closingWhere.OR = [
        { notes: { contains: `[Operator:` } },
        { userId: filterUserId },
      ];
    }

    const existingClosing = await prisma.dailyClosing.findFirst({
      where: closingWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, fullName: true, role: true } },
      },
    });

    return res.json({
      date: targetDate.toISOString().split('T')[0],
      filterUserId,
      totalSales,
      cashCollected,
      bankPayments,
      otherPayments,
      creditSales,
      debtRepayments: totalRepayments,
      expenses: totalExpenses,
      expectedCash,
      closingRecord: parseClosing(existingClosing),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/reconciliation/history (Owner/Admin only: list past daily closing records & shortages)
router.get('/history', authenticateToken, requireOwner, async (req: AuthRequest, res: Response) => {
  try {
    const history = await prisma.dailyClosing.findMany({
      orderBy: { date: 'desc' },
      take: 60,
      include: {
        user: { select: { id: true, username: true, fullName: true, role: true } },
      },
    });

    const parsed = history.map(parseClosing);
    return res.json(parsed);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/reconciliation/close (Owner/Admin closes the day for an operator or combined business)
router.post('/close', authenticateToken, requireOwner, async (req: AuthRequest, res: Response) => {
  try {
    const {
      date,
      totalSales,
      cashCollected,
      bankPayments,
      otherPayments,
      creditSales = 0,
      debtRepayments = 0,
      expenses = 0,
      expectedCash,
      actualCash,
      notes,
      operatorName = 'All Operators (Combined)',
      operatorId,
    } = req.body;

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const expected = Number(expectedCash);
    const actual = Number(actualCash);
    const discrepancy = actual - expected;

    // Structured notes storing Operator audited while preserving Admin as userId
    const opTag = `[Operator: ${operatorName.trim()}]`;
    const cleanUserNotes = notes ? notes.trim() : '';
    const storedNotes = `${opTag} ${cleanUserNotes}`.trim();

    // Check if a closing record already exists for this date and operator
    const existingClosing = await prisma.dailyClosing.findFirst({
      where: {
        date: { gte: targetDate, lt: nextDay },
        notes: { contains: opTag },
      },
    });

    let closing;
    if (existingClosing) {
      closing = await prisma.dailyClosing.update({
        where: { id: existingClosing.id },
        data: {
          totalSales: Number(totalSales),
          cashCollected: Number(cashCollected),
          bankPayments: Number(bankPayments),
          otherPayments: Number(otherPayments),
          creditSales: Number(creditSales),
          debtRepayments: Number(debtRepayments),
          expenses: Number(expenses),
          expectedCash: expected,
          actualCash: actual,
          discrepancy,
          notes: storedNotes,
          status: discrepancy === 0 ? 'RECONCILED' : 'CLOSED',
          userId: req.user!.userId, // Always the Admin/Owner who closed it!
        },
        include: {
          user: { select: { id: true, username: true, fullName: true, role: true } },
        },
      });
    } else {
      // Create new closing timestamp on target date
      const now = new Date();
      const closingDate = new Date(targetDate);
      closingDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

      closing = await prisma.dailyClosing.create({
        data: {
          date: closingDate,
          userId: req.user!.userId, // Always the Admin/Owner who closed it!
          totalSales: Number(totalSales),
          cashCollected: Number(cashCollected),
          bankPayments: Number(bankPayments),
          otherPayments: Number(otherPayments),
          creditSales: Number(creditSales),
          debtRepayments: Number(debtRepayments),
          expenses: Number(expenses),
          expectedCash: expected,
          actualCash: actual,
          discrepancy,
          notes: storedNotes,
          status: discrepancy === 0 ? 'RECONCILED' : 'CLOSED',
        },
        include: {
          user: { select: { id: true, username: true, fullName: true, role: true } },
        },
      });
    }

    // Audit event
    await prisma.auditEvent.create({
      data: {
        userId: req.user!.userId,
        action: 'DAILY_CLOSING_AUDIT',
        entity: 'DailyClosing',
        entityId: closing.id,
        details: {
          auditDate: targetDate,
          auditedOperator: operatorName,
          closedByAdmin: req.user!.username,
          expectedCash: expected,
          actualCash: actual,
          discrepancy,
        },
      },
    });

    return res.json(parseClosing(closing));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
