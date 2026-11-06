import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, AuthRequest } from '../middlewares/auth';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    // 1. Sales
    const todaySales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: today },
        status: { not: 'CANCELLED' },
      },
      include: { items: true, payments: true },
    });

    const yesterdaySales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: yesterday, lt: today },
        status: { not: 'CANCELLED' },
      },
      include: { items: true, payments: true },
    });

    const todaySalesTotal = todaySales.reduce((acc, s) => acc + Number(s.totalAmount), 0);
    const yesterdaySalesTotal = yesterdaySales.reduce((acc, s) => acc + Number(s.totalAmount), 0);
    const salesChangePct = yesterdaySalesTotal > 0
      ? Math.round(((todaySalesTotal - yesterdaySalesTotal) / yesterdaySalesTotal) * 100)
      : 0;

    // 2. Purchases
    const todayPurchases = await prisma.purchaseOrder.findMany({
      where: {
        createdAt: { gte: today },
        status: { not: 'CANCELLED' },
      },
    });
    const todayPurchasesTotal = todayPurchases.reduce((acc, p) => acc + Number(p.totalAmount), 0);

    // Yesterday purchases (real query)
    const yesterdayPurchases = await prisma.purchaseOrder.findMany({
      where: {
        createdAt: { gte: yesterday, lt: today },
        status: { not: 'CANCELLED' },
      },
    });
    const yesterdayPurchasesTotal = yesterdayPurchases.reduce((acc, p) => acc + Number(p.totalAmount), 0);
    const purchasesChangePct = yesterdayPurchasesTotal > 0
      ? Math.round(((todayPurchasesTotal - yesterdayPurchasesTotal) / yesterdayPurchasesTotal) * 100)
      : 0;

    // 3. Stock Value (Sum of quantity * purchasePrice)
    const allProducts = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
    });

    const stockValueTotal = allProducts.reduce((acc, p) => {
      return acc + (Number(p.stockQuantity) * Number(p.purchasePrice));
    }, 0);

    // 4. Customer Debt (Sum of customer outstandingDebt)
    const allCustomers = await prisma.customer.findMany({
      where: { isActive: true },
    });
    const customerDebtTotal = allCustomers.reduce((acc, c) => acc + Number(c.outstandingDebt), 0);

    // 5. Gross Profit and Net Profit
    // Gross Profit = Total Revenue - Cost of Goods Sold
    let todayCOGS = 0;
    for (const sale of todaySales) {
      for (const item of sale.items) {
        todayCOGS += Number(item.quantity) * Number(item.costPrice);
      }
    }
    const todayGrossProfit = Math.max(0, todaySalesTotal - todayCOGS);

    // Today's Expenses
    const todayExpenses = await prisma.expense.findMany({
      where: { createdAt: { gte: today } },
    });
    const todayExpensesTotal = todayExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
    const todayNetProfit = todayGrossProfit - todayExpensesTotal;

    // Weekly sales & profit trend — real data for the last 7 days
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trendData: { day: string; revenue: number; profit: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const daySales = await prisma.sale.findMany({
        where: {
          createdAt: { gte: dayStart, lt: dayEnd },
          status: { not: 'CANCELLED' },
        },
        include: { items: true },
      });

      const dayRevenue = daySales.reduce((acc, s) => acc + Number(s.totalAmount), 0);
      let dayCOGS = 0;
      for (const sale of daySales) {
        for (const item of sale.items) {
          dayCOGS += Number(item.quantity) * Number(item.costPrice);
        }
      }
      const dayProfit = Math.max(0, dayRevenue - dayCOGS);

      trendData.push({
        day: dayNames[dayStart.getDay()],
        revenue: dayRevenue,
        profit: dayProfit,
      });
    }

    // 6. Low stock alerts
    const lowStockAlerts = allProducts
      .filter((p) => Number(p.stockQuantity) <= Number(p.minStockThreshold))
      .map((p) => ({
        id: p.id,
        name: p.name,
        stockRemaining: Number(p.stockQuantity),
        threshold: Number(p.minStockThreshold),
        unit: p.unit,
      }));

    // 7. Pending approvals count
    const pendingCancellations = await prisma.cancellationRequest.count({
      where: { status: 'PENDING' },
    });

    const pendingReversals = await prisma.cancellationRequest.count({
      where: { status: 'PENDING', transactionType: 'PURCHASE' },
    });

    const expiringCount = allProducts.filter((p) => {
      if (!p.expiryDate) return false;
      const daysUntilExpiry = (new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    }).length;

    return res.json({
      cards: {
        todaySales: {
          value: todaySalesTotal,
          changePct: salesChangePct,
          period: 'vs yesterday',
        },
        purchases: {
          value: todayPurchasesTotal,
          changePct: purchasesChangePct,
          period: 'vs yesterday',
        },
        stockValue: {
          value: Math.round(stockValueTotal),
          changePct: 0,
          period: 'vs last week',
        },
        customerDebt: {
          value: customerDebtTotal,
          changePct: 0,
          period: 'vs last week',
        },
        grossProfit: {
          value: todayGrossProfit,
          changePct: 0,
          period: 'vs last week',
        },
        netProfit: {
          value: todayNetProfit,
          changePct: 0,
          period: 'vs last week',
        },
      },
      trend: trendData,
      lowStockAlerts: lowStockAlerts,
      pendingApprovals: {
        cancellationRequests: pendingCancellations,
        reversalRequests: pendingReversals,
        expiryAlerts: expiringCount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
