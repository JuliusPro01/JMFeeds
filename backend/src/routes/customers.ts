import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, requireOwner, AuthRequest } from '../middlewares/auth';

const router = Router();

// Get all customers
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        sales: { take: 10, orderBy: { createdAt: 'desc' } },
        repayments: { take: 10, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { name: 'asc' },
    });
    return res.json(customers);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Register customer
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, email, address, customerType, creditLimit } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        email,
        address,
        customerType: customerType || 'REGULAR',
        creditLimit: Number(creditLimit || 0),
      },
    });
    return res.json(customer);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Record debt repayment
router.post('/repay', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, amount, paymentMethod, reference } = req.body;
    if (!customerId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Customer ID and valid repayment amount required' });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const repayAmount = Number(amount);
    const currentDebt = Number(customer.outstandingDebt);

    if (repayAmount > currentDebt) {
      // Allow overpayment or cap it according to business rules; here we allow it or reduce debt to 0
    }

    const newDebt = Math.max(0, currentDebt - repayAmount);

    const result = await prisma.$transaction(async (tx) => {
      const repayment = await tx.debtRepayment.create({
        data: {
          repaymentNumber: `REP-${Date.now().toString().slice(-6)}`,
          customerId,
          amount: repayAmount,
          paymentMethod: paymentMethod || 'CASH',
          reference: reference || null,
          userId: req.user!.userId,
        },
      });

      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: { outstandingDebt: newDebt },
      });

      return { repayment, updatedCustomer };
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
