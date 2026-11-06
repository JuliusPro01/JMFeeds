import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, AuthRequest } from '../middlewares/auth';

const router = Router();

// GET /api/analytics/profitability
router.get('/profitability', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // 1. Get all products with category and sale items
    const products = await prisma.product.findMany({
      include: {
        category: true,
        saleItems: {
          include: { sale: true },
        },
      },
    });

    const productProfitability = products.map((p) => {
      // Completed, non-cancelled sales
      const validSaleItems = p.saleItems.filter(
        (si) => si.sale && si.sale.status !== 'CANCELLED' && si.sale.status !== 'REVERSED'
      );

      const qtySold = validSaleItems.reduce((acc, si) => acc + Number(si.quantity), 0);
      const revenue = validSaleItems.reduce((acc, si) => acc + Number(si.totalPrice), 0);
      const cogs = validSaleItems.reduce(
        (acc, si) => acc + Number(si.quantity) * Number(si.costPrice),
        0
      );
      const grossProfit = revenue - cogs;
      const margin = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : '0.0';
      const stockValuation = Number(p.stockQuantity) * Number(p.purchasePrice);

      return {
        id: p.id,
        name: p.name,
        category: p.category.name,
        unit: p.unit,
        purchaseCost: Number(p.purchasePrice),
        sellingPrice: Number(p.sellingPrice),
        stockQuantity: Number(p.stockQuantity),
        qtySold,
        revenue,
        cogs,
        grossProfit,
        margin: Number(margin),
        stockValuation,
      };
    });

    // 2. Category Profitability
    const categoryMap: { [key: string]: { name: string; revenue: number; cogs: number; profit: number } } = {};
    for (const pp of productProfitability) {
      if (!categoryMap[pp.category]) {
        categoryMap[pp.category] = { name: pp.category, revenue: 0, cogs: 0, profit: 0 };
      }
      categoryMap[pp.category].revenue += pp.revenue;
      categoryMap[pp.category].cogs += pp.cogs;
      categoryMap[pp.category].profit += pp.grossProfit;
    }

    // 3. Overall Business Performance
    const allSales = await prisma.sale.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: { items: true, payments: true },
    });

    const totalRevenue = allSales.reduce((acc, s) => acc + Number(s.totalAmount), 0);
    const amountCollected = allSales.reduce((acc, s) => acc + Number(s.amountPaid), 0);
    const creditSales = allSales
      .filter((s) => s.isCredit)
      .reduce((acc, s) => acc + Number(s.balanceDue), 0);

    const customers = await prisma.customer.findMany({ where: { isActive: true } });
    const outstandingDebts = customers.reduce((acc, c) => acc + Number(c.outstandingDebt), 0);

    const totalCOGS = productProfitability.reduce((acc, p) => acc + p.cogs, 0);
    const grossProfit = Math.max(0, totalRevenue - totalCOGS);

    const expenses = await prisma.expense.findMany();
    const operatingExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
    const netProfit = grossProfit - operatingExpenses;

    const inventoryValuation = productProfitability.reduce(
      (acc, p) => acc + p.stockValuation,
      0
    );

    // Supplier payables from pending POs
    const pendingPOs = await prisma.purchaseOrder.findMany({
      where: { status: { in: ['PENDING', 'PARTIALLY_RECEIVED'] } },
    });
    const supplierPayables = pendingPOs.reduce((acc, po) => acc + Number(po.totalAmount), 0);

    // Top products by profit for chart
    const topProducts = [...productProfitability]
      .filter((p) => p.revenue > 0)
      .sort((a, b) => b.grossProfit - a.grossProfit)
      .slice(0, 5)
      .map((p) => ({
        name: p.name.replace(/ \d+kg|\d+ml/, ''),
        revenue: p.revenue,
        profit: p.grossProfit,
      }));

    return res.json({
      productProfitability,
      categoryProfitability: Object.values(categoryMap),
      overview: {
        totalRevenue: totalRevenue,
        amountCollected: amountCollected,
        creditSales: creditSales,
        outstandingDebts: outstandingDebts,
        totalCOGS: totalCOGS,
        grossProfit: grossProfit,
        operatingExpenses: operatingExpenses,
        netProfit: netProfit,
        inventoryValuation: inventoryValuation,
        supplierPayables: supplierPayables,
      },
      topProducts: topProducts,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
