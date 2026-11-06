import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, AuthRequest } from '../middlewares/auth';

const router = Router();

// GET /api/reports/sales
router.get('/sales', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, categoryId, paymentMethod, customerId, userId } = req.query;
    const where: any = { status: { not: 'CANCELLED' } };

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

    if (customerId) where.customerId = String(customerId);

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: true,
        user: { select: { username: true, fullName: true } },
        items: { include: { product: { include: { category: true } } } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(sales);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/inventory
router.get('/inventory', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        supplier: true,
        inventoryMoves: { take: 5, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { name: 'asc' },
    });

    const report = products.map((p) => {
      const stock = Number(p.stockQuantity);
      const threshold = Number(p.minStockThreshold);
      const unitCost = Number(p.purchasePrice);
      const unitPrice = Number(p.sellingPrice);
      const valuation = stock * unitCost;

      let status = 'In Stock';
      if (stock === 0) status = 'Out of Stock';
      else if (stock <= threshold) status = 'Low Stock';

      if (p.expiryDate) {
        const days = (new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
        if (days < 0) status = 'Expired';
        else if (days <= 30) status = 'Expiring Soon';
      }

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category.name,
        supplier: p.supplier?.name || 'N/A',
        stock,
        unit: p.unit,
        unitCost,
        unitPrice,
        valuation,
        status,
        expiryDate: p.expiryDate,
      };
    });

    return res.json(report);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/purchases
router.get('/purchases', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        user: { select: { username: true, fullName: true } },
        items: { include: { product: true } },
        goodsReceipts: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(orders);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/financial
router.get('/financial', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const sales = await prisma.sale.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: { items: true },
    });

    let totalRevenue = 0;
    let totalCOGS = 0;
    for (const s of sales) {
      totalRevenue += Number(s.totalAmount);
      for (const item of s.items) {
        totalCOGS += Number(item.quantity) * Number(item.costPrice);
      }
    }

    const grossProfit = Math.max(0, totalRevenue - totalCOGS);
    const expenses = await prisma.expense.findMany();
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = grossProfit - totalExpenses;

    const customers = await prisma.customer.findMany({ where: { isActive: true } });
    const receivables = customers.reduce((sum, c) => sum + Number(c.outstandingDebt), 0);

    const products = await prisma.product.findMany({ where: { isActive: true } });
    const inventoryValuation = products.reduce(
      (sum, p) => sum + Number(p.stockQuantity) * Number(p.purchasePrice),
      0
    );

    return res.json({
      revenue: totalRevenue,
      cogs: totalCOGS,
      grossProfit,
      expenses: totalExpenses,
      netProfit,
      receivables,
      inventoryValuation,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/audit
router.get('/audit', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const events = await prisma.auditEvent.findMany({
      include: {
        user: { select: { username: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const adjustments = await prisma.stockAdjustment.findMany({
      include: {
        product: true,
        user: { select: { username: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.json({
      events,
      adjustments,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
