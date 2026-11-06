import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, AuthRequest } from '../middlewares/auth';

const router = Router();

// GET /api/services/status
router.get('/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.businessSettings.findFirst();
    return res.json({ enabled: settings?.enableServices ?? false });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/services/types
router.get('/types', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const types = await prisma.serviceType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return res.json(types);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/services/types
router.post('/types', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, price, commissionType = 'PERCENTAGE', defaultCommission } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Service name and price required' });

    const service = await prisma.serviceType.create({
      data: {
        name,
        description,
        price: Number(price),
        commissionType,
        defaultCommission: Number(defaultCommission || 20),
      },
    });
    return res.json(service);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/services/types/:id
router.put('/types/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, price, commissionType, defaultCommission, isActive } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = Number(price);
    if (commissionType !== undefined) data.commissionType = commissionType;
    if (defaultCommission !== undefined) data.defaultCommission = Number(defaultCommission);
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const updated = await prisma.serviceType.update({
      where: { id },
      data,
    });
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/services/types/:id
router.delete('/types/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.serviceType.update({
      where: { id },
      data: { isActive: false },
    });
    return res.json({ message: 'Service type deactivated' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/services/employees
router.get('/employees', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      include: {
        services: true,
        commissions: true,
      },
      orderBy: { name: 'asc' },
    });

    const summary = employees.map((emp) => {
      const customersServed = emp.services.length;
      const totalService = emp.services.reduce((acc, s) => acc + Number(s.amountCharged), 0);
      const totalCommission = emp.services.reduce((acc, s) => acc + Number(s.commissionEarned), 0);
      const commissionPaid = emp.commissions.reduce((acc, c) => acc + Number(c.amount), 0);
      const outstandingCommission = Math.max(0, totalCommission - commissionPaid);

      return {
        id: emp.id,
        name: emp.name,
        employeeCode: emp.employeeCode,
        phone: emp.phone,
        role: emp.role,
        customersServed,
        totalService,
        totalCommission,
        commissionPaid,
        outstandingCommission,
      };
    });

    return res.json(summary);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/services/employees
router.post('/employees', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, role } = req.body;
    if (!name) return res.status(400).json({ error: 'Employee name required' });

    const count = await prisma.employee.count();
    const employeeCode = `EMP-${String(count + 1).padStart(3, '0')}`;

    const employee = await prisma.employee.create({
      data: {
        name,
        employeeCode,
        phone: phone || null,
        role: role || 'Attendant',
      },
    });
    return res.json(employee);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/services/transactions
router.get('/transactions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const transactions = await prisma.serviceTransaction.findMany({
      include: {
        employee: true,
        serviceType: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(transactions);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/services/transactions
router.post('/transactions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, serviceTypeId, customerName, amountCharged, amountPaid, paymentMethod = 'CASH' } = req.body;

    if (!employeeId || !serviceTypeId || !amountCharged) {
      return res.status(400).json({ error: 'Employee, service type, and amount required' });
    }

    const service = await prisma.serviceType.findUnique({ where: { id: serviceTypeId } });
    if (!service) return res.status(404).json({ error: 'Service type not found' });

    const charged = Number(amountCharged);
    const paid = Number(amountPaid !== undefined ? amountPaid : charged);

    let commissionEarned = 0;
    const commRate = Number(service.defaultCommission);
    if (service.commissionType === 'PERCENTAGE') {
      commissionEarned = (charged * commRate) / 100;
    } else {
      commissionEarned = commRate;
    }

    const count = await prisma.serviceTransaction.count();
    const transactionNumber = `SRV-${String(count + 101).padStart(3, '0')}`;

    const txn = await prisma.serviceTransaction.create({
      data: {
        transactionNumber,
        customerName: customerName || 'Walk-in Client',
        employeeId,
        serviceTypeId,
        amountCharged: charged,
        amountPaid: paid,
        paymentMethod,
        commissionRate: commRate,
        commissionEarned,
      },
      include: {
        employee: true,
        serviceType: true,
      },
    });

    return res.json(txn);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/services/commissions/pay
router.post('/commissions/pay', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, amount, paymentMethod = 'CASH', reference, notes } = req.body;
    const payAmt = Number(amount);
    if (!employeeId || !amount || isNaN(payAmt) || payAmt <= 0) {
      return res.status(400).json({ error: 'Employee ID and valid positive amount required' });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        services: true,
        commissions: true,
      },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const totalCommission = employee.services.reduce((acc, s) => acc + Number(s.commissionEarned), 0);
    const commissionPaid = employee.commissions.reduce((acc, c) => acc + Number(c.amount), 0);
    const outstanding = Math.max(0, totalCommission - commissionPaid);

    if (payAmt > outstanding) {
      return res.status(400).json({
        error: `Cannot pay KSh ${payAmt.toLocaleString()}. Outstanding commission balance is only KSh ${outstanding.toLocaleString()}`,
      });
    }

    const payment = await prisma.commissionPayment.create({
      data: {
        employeeId,
        amount: payAmt,
        paymentMethod,
        reference: reference || null,
        notes: notes || null,
        userId: req.user!.userId,
      },
      include: { employee: true },
    });

    return res.json({
      ...payment,
      remainingBalance: Math.max(0, outstanding - payAmt),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
