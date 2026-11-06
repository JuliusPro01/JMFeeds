import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, AuthRequest } from '../middlewares/auth';

const router = Router();

// GET /api/debts
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const customersWithDebt = await prisma.customer.findMany({
      where: {
        outstandingDebt: { gt: 0 },
        isActive: true,
      },
      include: {
        sales: {
          where: { isCredit: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        repayments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { outstandingDebt: 'desc' },
    });

    // Also get all debtors summary table format matching mockup:
    // Customer, Total Credit, Paid, Balance, Due Date, Status
    const debtorsSummary = customersWithDebt.map((c) => {
      const totalCreditSales = c.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
      const totalPaid = c.sales.reduce((sum, s) => sum + Number(s.amountPaid), 0);
      const balance = Number(c.outstandingDebt);
      
      const latestCreditSale = c.sales[0];
      let dueDate = '-';
      let status = 'Pending';

      if (latestCreditSale) {
        const saleDate = new Date(latestCreditSale.createdAt);
        const due = new Date(saleDate);
        due.setDate(due.getDate() + 30); // 30 day credit term
        dueDate = due.toISOString().split('T')[0];
        if (new Date() > due && balance > 0) {
          status = 'Overdue';
        } else if (balance === 0) {
          status = 'Paid';
        }
      }

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        customerType: c.customerType,
        totalCredit: totalCreditSales || balance + totalPaid,
        paid: totalPaid,
        balance,
        dueDate,
        status,
      };
    });

    const totalOutstanding = customersWithDebt.reduce((acc, c) => acc + Number(c.outstandingDebt), 0);

    return res.json({
      totalOutstanding,
      debtors: debtorsSummary,
      customers: customersWithDebt,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/debts/repay
router.post('/repay', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, amount, paymentMethod = 'CASH', reference, notes } = req.body;
    if (!customerId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Customer ID and valid amount required' });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const payAmount = Number(amount);
    const currentDebt = Number(customer.outstandingDebt);
    const newDebt = Math.max(0, currentDebt - payAmount);

    const count = await prisma.debtRepayment.count();
    const repaymentNumber = `REP-${Date.now().toString().slice(-6)}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create DebtRepayment
      const repayment = await tx.debtRepayment.create({
        data: {
          repaymentNumber,
          customerId,
          amount: payAmount,
          paymentMethod,
          reference: reference || null,
          notes: notes || null,
          userId: req.user!.userId,
        },
      });

      // 2. Create PaymentRecord
      await tx.paymentRecord.create({
        data: {
          debtRepaymentId: repayment.id,
          amount: payAmount,
          paymentMethod,
          reference: reference || null,
        },
      });

      // 3. Atomically update customer outstanding debt
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: { outstandingDebt: newDebt },
      });

      // 4. Record audit event
      await tx.auditEvent.create({
        data: {
          userId: req.user!.userId,
          action: 'DEBT_REPAYMENT',
          entity: 'Customer',
          entityId: customerId,
          details: {
            repaymentNumber,
            amount: payAmount,
            previousDebt: currentDebt,
            newDebt,
            paymentMethod,
          },
        },
      });

      return { repayment, updatedCustomer };
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/debts/statement/:customerId
router.get('/statement/:customerId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { customerId } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        sales: {
          include: { items: { include: { product: true } } },
          orderBy: { createdAt: 'desc' },
        },
        repayments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    return res.json(customer);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
