import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, requireOwner, AuthRequest } from '../middlewares/auth';

const router = Router();

// Get categories
router.get('/categories', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    return res.json(categories);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Create category (Owner only)
router.post('/categories', authenticateToken, requireOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name required' });

    const category = await prisma.category.create({
      data: { name, description },
    });
    return res.json(category);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Get suppliers
router.get('/suppliers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json(suppliers);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Create supplier
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

// Get products (with filters)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { search, categoryId, lowStock, status } = req.query;
    const where: any = {};

    if (status === 'ARCHIVED') {
      where.isActive = false;
    } else if (status === 'ALL') {
      // return both active and archived
    } else {
      where.isActive = true; // default: active only
    }

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { sku: { contains: String(search), mode: 'insensitive' } },
        { barcode: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    if (categoryId && categoryId !== 'ALL') {
      where.categoryId = String(categoryId);
    }

    let products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        supplier: true,
        _count: {
          select: {
            saleItems: true,
            purchaseItems: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (lowStock === 'true') {
      products = products.filter(p => Number(p.stockQuantity) <= Number(p.minStockThreshold));
    }

    return res.json(products);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Create product (Owner only)
router.post('/', authenticateToken, requireOwner, async (req: AuthRequest, res: Response) => {
  try {
    const {
      sku,
      barcode,
      name,
      description,
      categoryId,
      brand,
      variant,
      unit,
      purchasePrice,
      sellingPrice,
      stockQuantity,
      minStockThreshold,
      supplierId,
    } = req.body;

    if (!sku || !name || !categoryId || purchasePrice === undefined || sellingPrice === undefined) {
      return res.status(400).json({ error: 'Missing required product fields' });
    }

    const product = await prisma.product.create({
      data: {
        sku,
        barcode: barcode || null,
        name,
        description,
        categoryId,
        brand,
        variant,
        unit: unit || 'pcs',
        purchasePrice: Number(purchasePrice),
        sellingPrice: Number(sellingPrice),
        stockQuantity: Number(stockQuantity || 0),
        minStockThreshold: Number(minStockThreshold || 5),
        supplierId: supplierId || null,
      },
      include: { category: true, supplier: true },
    });

    // If initial stock > 0, record movement
    if (Number(stockQuantity || 0) > 0) {
      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          userId: req.user!.userId,
          movementType: 'ADJUSTMENT',
          quantityChange: Number(stockQuantity),
          balanceBefore: 0,
          balanceAfter: Number(stockQuantity),
          notes: 'Initial opening stock',
        },
      });
    }

    return res.json(product);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Update product
router.put('/:id', authenticateToken, requireOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      sku,
      barcode,
      name,
      description,
      categoryId,
      brand,
      variant,
      unit,
      purchasePrice,
      sellingPrice,
      stockQuantity,
      minStockThreshold,
      supplierId,
      isActive,
    } = req.body;

    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) return res.status(404).json({ error: 'Product not found' });

    const newStock = stockQuantity !== undefined && stockQuantity !== '' ? Number(stockQuantity) : undefined;
    const oldStock = Number(existingProduct.stockQuantity);

    const updated = await prisma.product.update({
      where: { id },
      data: {
        sku: sku !== undefined ? sku.trim() : undefined,
        barcode: barcode !== undefined ? (barcode.trim() || null) : undefined,
        name: name !== undefined ? name.trim() : undefined,
        description: description !== undefined ? (description.trim() || null) : undefined,
        categoryId: categoryId !== undefined ? categoryId : undefined,
        brand: brand !== undefined ? (brand.trim() || null) : undefined,
        variant: variant !== undefined ? (variant.trim() || null) : undefined,
        unit: unit !== undefined ? unit : undefined,
        purchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : undefined,
        sellingPrice: sellingPrice !== undefined ? Number(sellingPrice) : undefined,
        stockQuantity: newStock !== undefined ? newStock : undefined,
        minStockThreshold: minStockThreshold !== undefined ? Number(minStockThreshold) : undefined,
        supplierId: supplierId !== undefined ? (supplierId || null) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
      include: { category: true, supplier: true },
    });

    // Record inventory adjustment movement if stock quantity was manually corrected
    if (newStock !== undefined && newStock !== oldStock) {
      await prisma.inventoryMovement.create({
        data: {
          productId: id,
          userId: req.user!.userId,
          movementType: 'ADJUSTMENT',
          quantityChange: newStock - oldStock,
          balanceBefore: oldStock,
          balanceAfter: newStock,
          notes: 'Manual inventory adjustment / product edit',
        },
      });
    }

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/products/:id (Smart delete: permanent if zero transactions, archive/deactivate if has history)
router.delete('/:id', authenticateToken, requireOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            saleItems: true,
            purchaseItems: true,
            receiptItems: true,
            stockAdjustments: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const hasHistory =
      product._count.saleItems > 0 ||
      product._count.purchaseItems > 0 ||
      product._count.receiptItems > 0 ||
      product._count.stockAdjustments > 0;

    if (hasHistory) {
      // Soft-delete / Archive: Set isActive to false
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      await prisma.auditEvent.create({
        data: {
          userId: req.user!.userId,
          action: 'ARCHIVE_PRODUCT',
          entity: 'Product',
          entityId: id,
          details: { name: product.name, sku: product.sku, reason: 'Has transaction history, archived' },
        },
      });

      return res.json({
        action: 'ARCHIVED',
        message: `Product "${product.name}" has past sales/purchase records, so it was safely moved to Archived (hidden from POS & active stock).`,
      });
    } else {
      // Zero history: permanent delete
      await prisma.inventoryMovement.deleteMany({
        where: { productId: id },
      });

      await prisma.product.delete({
        where: { id },
      });

      await prisma.auditEvent.create({
        data: {
          userId: req.user!.userId,
          action: 'DELETE_PRODUCT',
          entity: 'Product',
          entityId: id,
          details: { name: product.name, sku: product.sku, reason: 'Zero history, permanently deleted' },
        },
      });

      return res.json({
        action: 'DELETED',
        message: `Product "${product.name}" had no transactions and was permanently deleted.`,
      });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
