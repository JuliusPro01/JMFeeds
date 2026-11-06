import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, requireOwner, AuthRequest } from '../middlewares/auth';

const router = Router();

// Get inventory movements ledger
router.get('/ledger', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const movements = await prisma.inventoryMovement.findMany({
      include: { product: true, user: { select: { username: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return res.json(movements);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Record stock adjustment (Owner or Authorized)
router.post('/adjust', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { productId, newQuantity, reason } = req.body;
    if (!productId || newQuantity === undefined || !reason) {
      return res.status(400).json({ error: 'Product ID, new quantity, and reason are required' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const oldQty = Number(product.stockQuantity);
    const targetQty = Number(newQuantity);
    const diff = targetQty - oldQty;

    const [updatedProduct, movement, adjustment] = await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: { stockQuantity: targetQty },
      }),
      prisma.inventoryMovement.create({
        data: {
          productId,
          userId: req.user!.userId,
          movementType: 'ADJUSTMENT',
          quantityChange: diff,
          balanceBefore: oldQty,
          balanceAfter: targetQty,
          notes: reason,
        },
      }),
      prisma.stockAdjustment.create({
        data: {
          productId,
          userId: req.user!.userId,
          oldQuantity: oldQty,
          newQuantity: targetQty,
          reason,
        },
      }),
    ]);

    return res.json({ updatedProduct, movement, adjustment });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
