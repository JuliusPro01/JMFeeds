import bcrypt from 'bcryptjs';
import prisma from './prisma';

/**
 * Clean Production Seeder for JMFeeds
 * 
 * Prepares the system for GO-LIVE:
 * 1. Clears all demo / dummy sales, debts, expenses, purchases, customers, and mock stock.
 * 2. Leaves zero financial or inventory transactions so the shop starts with a clean ledger.
 * 3. Keeps only:
 *    - Business Settings configured for Voice of the Farmer JM Feeds in Murang'a Town
 *    - Core Categories ("Animal Feed" and "Cosmetics")
 *    - Owner Account ready for login
 */
export async function seedCleanProduction() {
  console.log('--- Cleaning database for Production Go-Live ---');

  // SAFETY GUARD: Never wipe if real products, customers, or sales already exist!
  const existingProducts = await prisma.product.count();
  const existingSales = await prisma.sale.count();
  if ((existingProducts > 0 || existingSales > 0) && process.env.FORCE_WIPE !== 'true') {
    console.log(`[SAFETY GUARD TRIGGERED] Database already contains ${existingProducts} products and ${existingSales} sales.`);
    console.log('[SAFETY GUARD] Skipping wipe completely to protect live data.');
    return;
  }

  // 1. Wipe all transactional records in dependency order
  console.log('Clearing demo transactions and dummy data...');
  await prisma.commissionPayment.deleteMany({});
  await prisma.serviceTransaction.deleteMany({});
  await prisma.serviceType.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.cancellationRequest.deleteMany({});
  await prisma.stockAdjustment.deleteMany({});
  await prisma.debtRepayment.deleteMany({});
  await prisma.paymentRecord.deleteMany({});
  await prisma.saleItem.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.goodsReceiptItem.deleteMany({});
  await prisma.goodsReceipt.deleteMany({});
  await prisma.purchaseItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.inventoryMovement.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.dailyClosing.deleteMany({});
  await prisma.auditEvent.deleteMany({});
  await prisma.notification.deleteMany({});

  // 2. Wipe dummy inventory, customers, suppliers
  await prisma.product.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.supplier.deleteMany({});

  // 3. Keep or setup official business settings
  console.log("Configuring Voice of the Farmer JM Feeds shop settings...");
  await prisma.businessSettings.upsert({
    where: { id: 'default-settings' },
    update: {
      businessName: "Voice of the Farmer JM Feeds",
      contactPhone: '0726704623',
      contactEmail: 'info@jmfeeds.co.ke',
      physicalAddress: "Murang'a Town",
      currency: 'KSh',
      timeZone: 'Africa/Nairobi',
      taxRate: 0,
      enableServices: false, // services module dormant until owner enables
      allowNegativeStock: false,
      lowStockThreshold: 5,
      expiryAlertDays: 30,
      receiptFooter: "Thank you for shopping at Voice of the Farmer JM Feeds! Better Stock. Higher Profits.",
    },
    create: {
      id: 'default-settings',
      businessName: "Voice of the Farmer JM Feeds",
      contactPhone: '0726704623',
      contactEmail: 'info@jmfeeds.co.ke',
      physicalAddress: "Murang'a Town",
      currency: 'KSh',
      timeZone: 'Africa/Nairobi',
      taxRate: 0,
      enableServices: false,
      allowNegativeStock: false,
      lowStockThreshold: 5,
      expiryAlertDays: 30,
      receiptFooter: "Thank you for shopping at Voice of the Farmer JM Feeds! Better Stock. Higher Profits.",
    },
  });

  // 4. Ensure Categories exist
  console.log('Setting up primary product categories...');
  await prisma.category.upsert({
    where: { name: 'Animal Feed' },
    update: {},
    create: {
      name: 'Animal Feed',
      description: 'Feeds for dairy cattle, poultry, pigs, and livestock supplements',
    },
  });

  await prisma.category.upsert({
    where: { name: 'Cosmetics' },
    update: {},
    create: {
      name: 'Cosmetics',
      description: 'Skin care, hair care, oils, and beauty items',
    },
  });

  // 5. Ensure Owner Account exists with initial password
  console.log('Setting up Owner account...');
  const defaultPasswordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'owner' },
    update: {
      fullName: 'JM Feeds Owner',
      email: 'admin@jmfeeds.co.ke',
      phone: '0726704623',
      role: 'OWNER',
      isActive: true,
      permissions: { all: true },
    },
    create: {
      username: 'owner',
      fullName: 'JM Feeds Owner',
      email: 'admin@jmfeeds.co.ke',
      phone: '0726704623',
      passwordHash: defaultPasswordHash,
      role: 'OWNER',
      isActive: true,
      permissions: { all: true },
    },
  });

  console.log('--------------------------------------------------');
  console.log(' PRODUCTION CLEAN DATABASE READY:');
  console.log(' Products: 0 (Client can add actual products)');
  console.log(' Sales / Debts: 0 (Zero debt, zero mock sales)');
  console.log(' Customers: 0 (Clean slate)');
  console.log(' Expenses / Purchases: 0');
  console.log(' Owner Login: username "owner" or "admin@jmfeeds.co.ke"');
  console.log(' The Owner can change password anytime via Profile & Settings.');
  console.log('--------------------------------------------------');
}

// Allow direct execution: npx ts-node src/seed-clean.ts
if (require.main === module) {
  seedCleanProduction()
    .catch((err) => {
      console.error('Error during clean production seeding:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
