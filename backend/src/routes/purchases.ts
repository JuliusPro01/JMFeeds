import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, requireOwner, AuthRequest } from '../middlewares/auth';

const router = Router();

// GET /api/purchases/suppliers
router.get('/suppliers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        _count: { select: { purchaseOrders: true, products: true } },
      },
      orderBy: { name: 'asc' },
    });
    return res.json(suppliers);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/purchases/suppliers
router.post('/suppliers', authenticateToken, requireOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { name, contactPerson, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Supplier name required' });

    const supplier = await prisma.supplier.create({
      data: { name, contactPerson, phone, email, address },
    });
    return res.json(supplier);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/purchases/orders
router.get('/orders', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { status, supplierId } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (supplierId) where.supplierId = String(supplierId);

    const orders = await prisma.purchaseOrder.findMany({
      where,
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

// POST /api/purchases/orders
router.post('/orders', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    let { supplierId, items, notes } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one product item is required' });
    }

    // Auto-resolve or create default Direct Cash supplier if none selected or "direct-cash"
    if (!supplierId || supplierId === 'direct-cash' || supplierId === 'walkin') {
      let defaultSup = await prisma.supplier.findFirst({ where: { name: 'Direct Cash / Market Purchases' } });
      if (!defaultSup) {
        defaultSup = await prisma.supplier.create({
          data: {
            name: 'Direct Cash / Market Purchases',
            contactPerson: 'Local Farmers & Open Market',
            phone: 'N/A',
          },
        });
      }
      supplierId = defaultSup.id;
    }

    let totalAmount = 0;
    const itemsData: any[] = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) return res.status(404).json({ error: `Product not found: ${item.productId}` });

      const qty = Number(item.orderedQty);
      const unitCost = Number(item.unitCost !== undefined ? item.unitCost : product.purchasePrice);
      const totalCost = qty * unitCost;
      totalAmount += totalCost;

      itemsData.push({
        productId: product.id,
        orderedQty: qty,
        unitCost,
        totalCost,
      });
    }

    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-${String(count + 1).padStart(3, '0')}`;

    const order = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        userId: req.user!.userId,
        totalAmount,
        status: 'PENDING',
        notes: notes || null,
        items: {
          create: itemsData,
        },
      },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });

    return res.json(order);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/purchases/receipts
router.get('/receipts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const receipts = await prisma.goodsReceipt.findMany({
      include: {
        purchaseOrder: true,
        supplier: true,
        user: { select: { username: true, fullName: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(receipts);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/purchases/receive (Confirm Goods Received and atomically update inventory)
router.post('/receive', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { purchaseOrderId, items, notes } = req.body;
    if (!purchaseOrderId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Purchase Order ID and received items required' });
    }

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { items: true, supplier: true },
    });

    if (!order) return res.status(404).json({ error: 'Purchase order not found' });

    const count = await prisma.goodsReceipt.count();
    const receiptNumber = `GRN-${Date.now().toString().slice(-6)}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Goods Receipt
      const receipt = await tx.goodsReceipt.create({
        data: {
          receiptNumber,
          purchaseOrderId: order.id,
          supplierId: order.supplierId,
          userId: req.user!.userId,
          notes: notes || null,
        },
      });

      // 2. Process each item: update stock, record inventory movement, update purchase item received qty
      for (const item of items) {
        const receivedQty = Number(item.receivedQty || 0);
        if (receivedQty <= 0) continue;

        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Product not found: ${item.productId}`);

        const oldStock = Number(product.stockQuantity);
        const newStock = oldStock + receivedQty;

        // Update product stock and optionally batch/expiry
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: newStock,
            batchNumber: item.batchNumber || product.batchNumber,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : product.expiryDate,
          },
        });

        // Record GoodsReceiptItem
        await tx.goodsReceiptItem.create({
          data: {
            goodsReceiptId: receipt.id,
            productId: item.productId,
            receivedQty,
            unitCost: Number(item.unitCost || product.purchasePrice),
            batchNumber: item.batchNumber || null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          },
        });

        // Record InventoryMovement
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            userId: req.user!.userId,
            movementType: 'PURCHASE_RECEIPT',
            quantityChange: receivedQty,
            balanceBefore: oldStock,
            balanceAfter: newStock,
            referenceId: receipt.receiptNumber,
            notes: `Goods received against PO: ${order.poNumber}`,
          },
        });

        // Update PurchaseItem received qty
        const poItem = order.items.find((i) => i.productId === item.productId);
        if (poItem) {
          const newReceivedTotal = Number(poItem.receivedQty) + receivedQty;
          await tx.purchaseItem.update({
            where: { id: poItem.id },
            data: { receivedQty: newReceivedTotal },
          });
        }
      }

      // Check if all items in PO are fully received
      const updatedPOItems = await tx.purchaseItem.findMany({
        where: { purchaseOrderId: order.id },
      });
      const allReceived = updatedPOItems.every(
        (i) => Number(i.receivedQty) >= Number(i.orderedQty)
      );
      const anyReceived = updatedPOItems.some((i) => Number(i.receivedQty) > 0);

      const newStatus = allReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : 'PENDING';
      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status: newStatus },
      });

      return receipt;
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
