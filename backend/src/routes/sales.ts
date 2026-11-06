import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, AuthRequest } from '../middlewares/auth';

const router = Router();

// Get sales history
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.query;
    const where: any = {};

    const isOperator = req.user!.role === 'OPERATOR';
    if (isOperator) {
      where.userId = req.user!.userId;
    } else if (userId && userId !== 'ALL') {
      where.userId = String(userId);
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: true,
        user: { select: { username: true, fullName: true } },
        items: { include: { product: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return res.json(sales);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Create sale (Checkout)
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, items, discount = 0, payments = [] } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Sale must contain at least one item' });
    }

    let subTotal = 0;
    const processedItems: any[] = [];

    // Validate stock and compute totals
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return res.status(404).json({ error: `Product not found: ${item.productId}` });
      }

      const qty = Number(item.quantity);
      if (Number(product.stockQuantity) < qty) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}` });
      }

      const unitPrice = Number(item.unitPrice !== undefined ? item.unitPrice : product.sellingPrice);
      const totalPrice = qty * unitPrice;
      subTotal += totalPrice;

      processedItems.push({
        productId: product.id,
        quantity: qty,
        unitPrice,
        totalPrice,
        costPrice: Number(product.purchasePrice),
        product,
      });
    }

    const totalAmount = Math.max(0, subTotal - Number(discount));
    
    // Total amount paid across payment records
    let amountPaid = 0;
    for (const p of payments) {
      amountPaid += Number(p.amount || 0);
    }

    const balanceDue = Math.max(0, totalAmount - amountPaid);
    const isCredit = balanceDue > 0;

    if (isCredit && !customerId) {
      return res.status(400).json({ error: 'Credit sales require a registered customer' });
    }

    const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create sale record
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: customerId || null,
          userId: req.user!.userId,
          subTotal,
          discount: Number(discount),
          totalAmount,
          amountPaid,
          balanceDue,
          isCredit,
          status: 'COMPLETED',
          items: {
            create: processedItems.map(i => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.totalPrice,
              costPrice: i.costPrice,
            })),
          },
          payments: {
            create: payments.map((p: any) => ({
              amount: Number(p.amount),
              paymentMethod: p.paymentMethod || 'CASH',
              reference: p.reference || null,
            })),
          },
        },
        include: { items: true, payments: true, customer: true },
      });

      // 2. Update inventory & record movement
      for (const item of processedItems) {
        const oldQty = Number(item.product.stockQuantity);
        const newQty = oldQty - item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: newQty },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            userId: req.user!.userId,
            movementType: 'SALE',
            quantityChange: -item.quantity,
            balanceBefore: oldQty,
            balanceAfter: newQty,
            referenceId: sale.id,
            notes: `Sale invoice ${invoiceNumber}`,
          },
        });
      }

      // 3. Update customer debt if credit sale
      if (isCredit && customerId) {
        const customer = await tx.customer.findUnique({ where: { id: customerId } });
        if (customer) {
          const newDebt = Number(customer.outstandingDebt) + balanceDue;
          await tx.customer.update({
            where: { id: customerId },
            data: { outstandingDebt: newDebt },
          });
        }
      }

      return sale;
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
