import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, requireOwner, AuthRequest } from '../middlewares/auth';

const router = Router();

// GET /api/approvals (List pending, approved, rejected requests)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = String(status);
    }

    const requests = await prisma.cancellationRequest.findMany({
      where,
      include: {
        user: { select: { username: true, fullName: true, role: true } },
        sale: {
          include: {
            customer: true,
            items: { include: { product: true } },
            payments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pendingCount = await prisma.cancellationRequest.count({ where: { status: 'PENDING' } });
    const approvedCount = await prisma.cancellationRequest.count({ where: { status: 'APPROVED' } });
    const rejectedCount = await prisma.cancellationRequest.count({ where: { status: 'REJECTED' } });

    return res.json({
      requests,
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/approvals/request (Operator submits cancellation request)
router.post('/request', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { transactionType = 'SALE', transactionId, saleId, reason } = req.body;

    if (!transactionId || !reason) {
      return res.status(400).json({ error: 'Transaction ID and reason are mandatory' });
    }

    const newRequest = await prisma.cancellationRequest.create({
      data: {
        transactionType,
        transactionId: String(transactionId),
        saleId: saleId || (transactionType === 'SALE' ? String(transactionId) : null),
        userId: req.user!.userId,
        reason,
        status: 'PENDING',
      },
      include: {
        user: { select: { username: true, fullName: true } },
      },
    });

    // Notify owner
    await prisma.notification.create({
      data: {
        title: 'New Cancellation Request',
        message: `${req.user?.username || 'Operator'} requested cancellation for ${transactionType} #${transactionId}: "${reason}"`,
        type: 'WARNING',
      },
    });

    // Record audit event
    await prisma.auditEvent.create({
      data: {
        userId: req.user!.userId,
        action: 'SUBMIT_CANCELLATION_REQUEST',
        entity: 'CancellationRequest',
        entityId: newRequest.id,
        details: { transactionType, transactionId, reason },
      },
    });

    return res.json(newRequest);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/approvals/:id/review (Owner approves or rejects request)
router.post('/:id/review', authenticateToken, requireOwner, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, ownerNotes } = req.body; // action: 'APPROVE' | 'REJECT'

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT' });
    }

    const request = await prisma.cancellationRequest.findUnique({
      where: { id },
      include: {
        sale: {
          include: {
            items: true,
            customer: true,
          },
        },
      },
    });

    if (!request) return res.status(404).json({ error: 'Cancellation request not found' });
    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: `Request already ${request.status.toLowerCase()}` });
    }

    if (action === 'REJECT') {
      const updated = await prisma.cancellationRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          ownerNotes: ownerNotes || 'Rejected by owner',
          approvedById: req.user!.userId,
          approvedAt: new Date(),
        },
      });

      await prisma.auditEvent.create({
        data: {
          userId: req.user!.userId,
          action: 'REJECT_CANCELLATION',
          entity: 'CancellationRequest',
          entityId: id,
          details: { ownerNotes },
        },
      });

      // Notify operator & owner that request was rejected
      await prisma.notification.create({
        data: {
          title: 'Cancellation Request Rejected',
          message: `Cancellation for ${request.transactionType} #${request.sale?.invoiceNumber || request.transactionId} was rejected by ${req.user?.username || 'Owner'}. Reason: ${ownerNotes || 'No notes provided'}`,
          type: 'DANGER',
          link: '/approvals',
        },
      });

      return res.json({ message: 'Request rejected', request: updated });
    }

    // If APPROVE: Perform auditable atomic reversal
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark request as APPROVED
      const updatedReq = await tx.cancellationRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          ownerNotes: ownerNotes || 'Approved by owner',
          approvedById: req.user!.userId,
          approvedAt: new Date(),
        },
      });

      // 2. If it was a sale, reverse stock and customer debt
      if (request.sale) {
        // Mark sale as REVERSED
        await tx.sale.update({
          where: { id: request.sale.id },
          data: {
            status: 'REVERSED',
            reversalNotes: `Reversed per approval #${id}: ${ownerNotes || request.reason}`,
          },
        });

        // Restore inventory for each item
        for (const item of request.sale.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (product) {
            const currentStock = Number(product.stockQuantity);
            const returnQty = Number(item.quantity);
            const newStock = currentStock + returnQty;

            await tx.product.update({
              where: { id: item.productId },
              data: { stockQuantity: newStock },
            });

            await tx.inventoryMovement.create({
              data: {
                productId: item.productId,
                userId: req.user!.userId,
                movementType: 'REVERSAL',
                quantityChange: returnQty,
                balanceBefore: currentStock,
                balanceAfter: newStock,
                referenceId: request.sale.invoiceNumber,
                notes: `Sale reversal approval #${id}`,
              },
            });
          }
        }

        // If credit sale with balance, adjust customer debt
        if (request.sale.isCredit && request.sale.customerId) {
          const customer = await tx.customer.findUnique({
            where: { id: request.sale.customerId },
          });
          if (customer) {
            const saleDue = Number(request.sale.balanceDue);
            const newCustomerDebt = Math.max(0, Number(customer.outstandingDebt) - saleDue);
            await tx.customer.update({
              where: { id: request.sale.customerId },
              data: { outstandingDebt: newCustomerDebt },
            });
          }
        }
      }

      // Record Audit Event
      await tx.auditEvent.create({
        data: {
          userId: req.user!.userId,
          action: 'APPROVE_REVERSAL',
          entity: 'CancellationRequest',
          entityId: id,
          details: {
            transactionType: request.transactionType,
            transactionId: request.transactionId,
            ownerNotes,
          },
        },
      });

      return updatedReq;
    });

    // Notify operator & owner that request was approved and reversed
    await prisma.notification.create({
      data: {
        title: 'Cancellation Request Approved',
        message: `Cancellation for ${request.transactionType} #${request.sale?.invoiceNumber || request.transactionId} was approved by ${req.user?.username || 'Owner'}. Transaction reversed and inventory restored.`,
        type: 'SUCCESS',
        link: '/approvals',
      },
    });

    return res.json({ message: 'Request approved and reversal executed cleanly', request: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
