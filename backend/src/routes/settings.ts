import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, requireOwner, AuthRequest } from '../middlewares/auth';

const router = Router();

// GET /api/settings (Anyone authenticated can read; front-end uses for branding/module toggle)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    let settings = await prisma.businessSettings.findFirst();
    if (!settings) {
      settings = await prisma.businessSettings.create({
        data: { id: 'default-settings' },
      });
    }
    return res.json(settings);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/settings (Owner only)
router.put('/', authenticateToken, requireOwner, async (req: AuthRequest, res: Response) => {
  try {
    const {
      businessName,
      contactPhone,
      contactEmail,
      physicalAddress,
      currency,
      timeZone,
      taxRate,
      enableServices,
      allowNegativeStock,
      lowStockThreshold,
      expiryAlertDays,
      receiptFooter,
    } = req.body;

    const settings = await prisma.businessSettings.findFirst();
    if (!settings) return res.status(404).json({ error: 'Settings not found' });

    const updated = await prisma.businessSettings.update({
      where: { id: settings.id },
      data: {
        businessName: businessName !== undefined ? businessName : undefined,
        contactPhone: contactPhone !== undefined ? contactPhone : undefined,
        contactEmail: contactEmail !== undefined ? contactEmail : undefined,
        physicalAddress: physicalAddress !== undefined ? physicalAddress : undefined,
        currency: currency !== undefined ? currency : undefined,
        timeZone: timeZone !== undefined ? timeZone : undefined,
        taxRate: taxRate !== undefined ? Number(taxRate) : undefined,
        enableServices: enableServices !== undefined ? Boolean(enableServices) : undefined,
        allowNegativeStock: allowNegativeStock !== undefined ? Boolean(allowNegativeStock) : undefined,
        lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : undefined,
        expiryAlertDays: expiryAlertDays !== undefined ? Number(expiryAlertDays) : undefined,
        receiptFooter: receiptFooter !== undefined ? receiptFooter : undefined,
      },
    });

    await prisma.auditEvent.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE_SETTINGS',
        entity: 'BusinessSettings',
        entityId: settings.id,
        details: { businessName, enableServices },
      },
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
