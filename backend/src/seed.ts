import bcrypt from 'bcryptjs';
import prisma from './prisma';

export async function seedDatabase() {
  console.log('Seeding JMFeeds database...');

  // 1. Settings
  await prisma.businessSettings.upsert({
    where: { id: 'default-settings' },
    update: {},
    create: {
      id: 'default-settings',
      businessName: 'Voice of the Farmer JM Feeds',
      contactPhone: '0726704623',
      contactEmail: 'info@jmfeeds.co.ke',
      physicalAddress: "Murang'a Town",
      currency: 'KSh',
      timeZone: 'Africa/Nairobi',
      taxRate: 0,
      enableServices: true, // enabled for rich experience, toggleable in settings
      allowNegativeStock: false,
      lowStockThreshold: 5,
      expiryAlertDays: 30,
      receiptFooter: 'Thank you for choosing Voice of the Farmer JM Feeds! Better Stock. Higher Profits.',
    },
  });

  // 2. Users
  const passwordHash = await bcrypt.hash('admin123', 10);
  const operatorPasswordHash = await bcrypt.hash('operator123', 10);

  const owner = await prisma.user.upsert({
    where: { username: 'owner' },
    update: {
      email: 'admin@jmfeeds.co.ke',
      phone: '+254 70000000',
    },
    create: {
      username: 'owner',
      email: 'admin@jmfeeds.co.ke',
      phone: '+254 70000000',
      passwordHash,
      fullName: 'John Kamau',
      role: 'OWNER',
      isActive: true,
      permissions: { all: true },
    },
  });

  const operator = await prisma.user.upsert({
    where: { username: 'operator' },
    update: {
      email: 'operator@jmfeeds.co.ke',
      phone: '+254 722 112233',
    },
    create: {
      username: 'operator',
      email: 'operator@jmfeeds.co.ke',
      phone: '+254 722 112233',
      passwordHash: operatorPasswordHash,
      fullName: 'Mary Wanjiku',
      role: 'OPERATOR',
      isActive: true,
      permissions: { canSell: true, canAddCustomer: true, canRecordCredit: true },
    },
  });

  // 3. Categories
  const animalFeedCat = await prisma.category.upsert({
    where: { name: 'Animal Feed' },
    update: {},
    create: {
      name: 'Animal Feed',
      description: 'High quality commercial feeds for dairy, poultry, pigs and fish',
    },
  });

  const cosmeticsCat = await prisma.category.upsert({
    where: { name: 'Cosmetics' },
    update: {},
    create: {
      name: 'Cosmetics',
      description: 'Beauty, hair and skin care products',
    },
  });

  // 4. Suppliers
  const supplierFarmCare = await prisma.supplier.upsert({
    where: { id: 'sup-farmcare' },
    update: {},
    create: {
      id: 'sup-farmcare',
      name: 'FarmCare Supplies',
      contactPerson: 'David Kiptoo',
      phone: '+254 722 998877',
      email: 'sales@farmcare.co.ke',
      address: 'Nakuru Highway, Naivasha',
    },
  });

  const supplierNutri = await prisma.supplier.upsert({
    where: { id: 'sup-nutri' },
    update: {},
    create: {
      id: 'sup-nutri',
      name: 'NutriFeeds Ltd',
      contactPerson: 'Sarah Muthoni',
      phone: '+254 733 112233',
      email: 'orders@nutrifeeds.co.ke',
      address: 'Eldoret Industrial Zone',
    },
  });

  const supplierAgro = await prisma.supplier.upsert({
    where: { id: 'sup-agro' },
    update: {},
    create: {
      id: 'sup-agro',
      name: 'Agro Supplies',
      contactPerson: 'James Omondi',
      phone: '+254 710 445566',
      email: 'info@agrosupplies.com',
      address: 'Thika Road, Ruiru',
    },
  });

  const supplierFarmersCoop = await prisma.supplier.upsert({
    where: { id: 'sup-farmers' },
    update: {},
    create: {
      id: 'sup-farmers',
      name: 'Farmers Co-op',
      contactPerson: 'Samuel Mwangi',
      phone: '+254 711 778899',
      email: 'coop@farmers.or.ke',
      address: 'Nyeri Town',
    },
  });

  // 5. Products matching the mockup
  const productsData = [
    {
      id: 'prod-dairy-50',
      sku: 'FEED-DM-050',
      barcode: '123456789012',
      name: 'Dairy Meal 50kg',
      categoryId: animalFeedCat.id,
      supplierId: supplierFarmersCoop.id,
      brand: 'Kenya Feeds',
      unit: 'Bag',
      purchasePrice: 4000,
      sellingPrice: 4500,
      stockQuantity: 12,
      minStockThreshold: 10,
      description: 'High quality dairy meal for increased milk yield and cow health',
      expiryDate: new Date('2026-12-31'),
    },
    {
      id: 'prod-layer-25',
      sku: 'FEED-LF-025',
      barcode: '123456789013',
      name: 'Layer Feed 25kg',
      categoryId: animalFeedCat.id,
      supplierId: supplierNutri.id,
      brand: 'NutriLayers',
      unit: 'Bag',
      purchasePrice: 2200,
      sellingPrice: 2500,
      stockQuantity: 60,
      minStockThreshold: 15,
      description: 'Balanced poultry feed rich in calcium for egg-laying hens',
      expiryDate: new Date('2026-11-30'),
    },
    {
      id: 'prod-hairoil-200',
      sku: 'COSM-HO-200',
      barcode: '123456789014',
      name: 'Hair Oil 200ml',
      categoryId: cosmeticsCat.id,
      supplierId: supplierFarmCare.id,
      brand: 'GlowCare',
      unit: 'Pc',
      purchasePrice: 800,
      sellingPrice: 1200,
      stockQuantity: 45,
      minStockThreshold: 10,
      description: 'Natural herbal oil for hair conditioning and scalp treatment',
      expiryDate: new Date('2027-06-15'),
    },
    {
      id: 'prod-cowfeed-50',
      sku: 'FEED-CF-050',
      barcode: '123456789015',
      name: 'Cow Feed 50kg',
      categoryId: animalFeedCat.id,
      supplierId: supplierAgro.id,
      brand: 'AgroFeed',
      unit: 'Bag',
      purchasePrice: 2800,
      sellingPrice: 3200,
      stockQuantity: 20,
      minStockThreshold: 8,
      description: 'High nutrition cattle maintenance feed',
      expiryDate: new Date('2026-10-31'),
    },
    {
      id: 'prod-pigfeed-50',
      sku: 'FEED-PF-050',
      barcode: '123456789016',
      name: 'Pig Feed 50kg',
      categoryId: animalFeedCat.id,
      supplierId: supplierNutri.id,
      brand: 'PorkMaster',
      unit: 'Bag',
      purchasePrice: 2900,
      sellingPrice: 3400,
      stockQuantity: 4, // Low stock
      minStockThreshold: 10,
      description: 'Complete grower pig feed for fast weight gain',
      expiryDate: new Date('2026-11-15'),
    },
    {
      id: 'prod-fishfeed-10',
      sku: 'FEED-FF-010',
      barcode: '123456789017',
      name: 'Fish Feed 10kg',
      categoryId: animalFeedCat.id,
      supplierId: supplierFarmCare.id,
      brand: 'AquaGrow',
      unit: 'Bag',
      purchasePrice: 1800,
      sellingPrice: 2100,
      stockQuantity: 5, // Low stock
      minStockThreshold: 8,
      description: 'Floating pellets for tilapia and catfish',
      expiryDate: new Date('2026-12-01'),
    },
    {
      id: 'prod-shampoo-400',
      sku: 'COSM-SH-400',
      barcode: '123456789018',
      name: 'Shampoo 400ml',
      categoryId: cosmeticsCat.id,
      supplierId: supplierFarmCare.id,
      brand: 'SilkyCare',
      unit: 'Pc',
      purchasePrice: 450,
      sellingPrice: 650,
      stockQuantity: 35,
      minStockThreshold: 10,
      description: 'Moisturizing hair wash enriched with argan oil',
      expiryDate: new Date('2027-04-20'),
    },
  ];

  for (const p of productsData) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: p,
    });
  }

  // 6. Customers matching mockup
  const customerBenson = await prisma.customer.upsert({
    where: { phone: '+254 712 345678' },
    update: { outstandingDebt: 12000 },
    create: {
      name: 'Benson Mwangi',
      phone: '+254 712 345678',
      email: 'benson.mwangi@gmail.com',
      address: 'Kikuyu Farm, Kiambu',
      customerType: 'VIP',
      creditLimit: 50000,
      outstandingDebt: 12000,
      notes: 'Esteemed dairy farmer. High volume purchaser.',
    },
  });

  const customerGrace = await prisma.customer.upsert({
    where: { phone: '+254 722 112233' },
    update: { outstandingDebt: 0 },
    create: {
      name: 'Grace Wanjiru',
      phone: '+254 722 112233',
      email: 'grace.wanjiru@yahoo.com',
      address: 'Ruiru town',
      customerType: 'REGULAR',
      creditLimit: 20000,
      outstandingDebt: 0,
      notes: 'Poultry keeper, always pays on time.',
    },
  });

  const customerPeter = await prisma.customer.upsert({
    where: { phone: '+254 733 445566' },
    update: { outstandingDebt: 25000 },
    create: {
      name: 'Peter Kamau',
      phone: '+254 733 445566',
      email: 'kamau.peter@gmail.com',
      address: 'Limuru Feed Depot',
      customerType: 'WHOLESALE',
      creditLimit: 100000,
      outstandingDebt: 25000,
      notes: 'Wholesale distributor for animal feeds.',
    },
  });

  const customerFaith = await prisma.customer.upsert({
    where: { phone: '+254 720 998877' },
    update: { outstandingDebt: 0 },
    create: {
      name: 'Faith Njeri',
      phone: '+254 720 998877',
      customerType: 'REGULAR',
      creditLimit: 15000,
      outstandingDebt: 0,
    },
  });

  const customerJohn = await prisma.customer.upsert({
    where: { phone: '+254 711 002233' },
    update: { outstandingDebt: 0 },
    create: {
      name: 'John Doe',
      phone: '+254 711 002233',
      customerType: 'REGULAR',
      creditLimit: 10000,
      outstandingDebt: 0,
    },
  });

  // 7. Purchase Orders matching mockup
  await prisma.purchaseOrder.upsert({
    where: { poNumber: 'PO-001' },
    update: {},
    create: {
      poNumber: 'PO-001',
      supplierId: supplierFarmCare.id,
      userId: owner.id,
      totalAmount: 120000,
      status: 'PENDING',
      createdAt: new Date('2026-04-28'),
      items: {
        create: [
          {
            productId: 'prod-dairy-50',
            orderedQty: 30,
            receivedQty: 0,
            unitCost: 4000,
            totalCost: 120000,
          },
        ],
      },
    },
  });

  await prisma.purchaseOrder.upsert({
    where: { poNumber: 'PO-002' },
    update: {},
    create: {
      poNumber: 'PO-002',
      supplierId: supplierNutri.id,
      userId: owner.id,
      totalAmount: 85000,
      status: 'RECEIVED',
      createdAt: new Date('2026-04-25'),
      items: {
        create: [
          {
            productId: 'prod-layer-25',
            orderedQty: 35,
            receivedQty: 35,
            unitCost: 2200,
            totalCost: 77000,
          },
          {
            productId: 'prod-pigfeed-50',
            orderedQty: 2,
            receivedQty: 2,
            unitCost: 2900,
            totalCost: 5800,
          },
        ],
      },
    },
  });

  await prisma.purchaseOrder.upsert({
    where: { poNumber: 'PO-003' },
    update: {},
    create: {
      poNumber: 'PO-003',
      supplierId: supplierAgro.id,
      userId: owner.id,
      totalAmount: 78000,
      status: 'RECEIVED',
      createdAt: new Date('2026-04-22'),
      items: {
        create: [
          {
            productId: 'prod-cowfeed-50',
            orderedQty: 25,
            receivedQty: 25,
            unitCost: 2800,
            totalCost: 70000,
          },
        ],
      },
    },
  });

  // 8. Sales matching the mockup POS transaction & history
  const sale1 = await prisma.sale.upsert({
    where: { invoiceNumber: 'INV-1021' },
    update: {},
    create: {
      invoiceNumber: 'INV-1021',
      customerId: customerBenson.id,
      userId: operator.id,
      subTotal: 12150,
      discount: 0,
      totalAmount: 12150,
      amountPaid: 12150,
      balanceDue: 0,
      isCredit: false,
      status: 'COMPLETED',
      createdAt: new Date(Date.now() - 3600000 * 4),
      items: {
        create: [
          {
            productId: 'prod-dairy-50',
            quantity: 2,
            unitPrice: 4500,
            totalPrice: 9000,
            costPrice: 4000,
          },
          {
            productId: 'prod-layer-25',
            quantity: 1,
            unitPrice: 2500,
            totalPrice: 2500,
            costPrice: 2200,
          },
          {
            productId: 'prod-shampoo-400',
            quantity: 1,
            unitPrice: 650,
            totalPrice: 650,
            costPrice: 450,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 12150,
            paymentMethod: 'CASH',
            reference: 'CSH-1021',
          },
        ],
      },
    },
  });

  const sale2 = await prisma.sale.upsert({
    where: { invoiceNumber: 'INV-1022' },
    update: {},
    create: {
      invoiceNumber: 'INV-1022',
      customerId: customerGrace.id,
      userId: operator.id,
      subTotal: 12350,
      discount: 0,
      totalAmount: 12350,
      amountPaid: 12350,
      balanceDue: 0,
      isCredit: false,
      status: 'COMPLETED',
      createdAt: new Date(Date.now() - 3600000 * 2),
      items: {
        create: [
          {
            productId: 'prod-hairoil-200',
            quantity: 3,
            unitPrice: 1200,
            totalPrice: 3600,
            costPrice: 800,
          },
          {
            productId: 'prod-cowfeed-50',
            quantity: 2,
            unitPrice: 3200,
            totalPrice: 6400,
            costPrice: 2800,
          },
          {
            productId: 'prod-layer-25',
            quantity: 1,
            unitPrice: 2500,
            totalPrice: 2500,
            costPrice: 2200,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 12350,
            paymentMethod: 'BANK',
            reference: 'BNK-98214',
          },
        ],
      },
    },
  });

  // Credit sale for Benson Mwangi
  const creditSale = await prisma.sale.upsert({
    where: { invoiceNumber: 'INV-1023' },
    update: {},
    create: {
      invoiceNumber: 'INV-1023',
      customerId: customerBenson.id,
      userId: operator.id,
      subTotal: 25000,
      discount: 0,
      totalAmount: 25000,
      amountPaid: 13000,
      balanceDue: 12000,
      isCredit: true,
      status: 'COMPLETED',
      createdAt: new Date('2026-04-10'),
      items: {
        create: [
          {
            productId: 'prod-dairy-50',
            quantity: 5,
            unitPrice: 4500,
            totalPrice: 22500,
            costPrice: 4000,
          },
          {
            productId: 'prod-layer-25',
            quantity: 1,
            unitPrice: 2500,
            totalPrice: 2500,
            costPrice: 2200,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 13000,
            paymentMethod: 'CASH',
            reference: 'CSH-DEP-1023',
          },
        ],
      },
    },
  });

  // Credit sale for Peter Kamau
  await prisma.sale.upsert({
    where: { invoiceNumber: 'INV-1024' },
    update: {},
    create: {
      invoiceNumber: 'INV-1024',
      customerId: customerPeter.id,
      userId: operator.id,
      subTotal: 30000,
      discount: 0,
      totalAmount: 30000,
      amountPaid: 5000,
      balanceDue: 25000,
      isCredit: true,
      status: 'COMPLETED',
      createdAt: new Date('2026-04-05'),
      items: {
        create: [
          {
            productId: 'prod-dairy-50',
            quantity: 6,
            unitPrice: 4500,
            totalPrice: 27000,
            costPrice: 4000,
          },
          {
            productId: 'prod-cowfeed-50',
            quantity: 1,
            unitPrice: 3200,
            totalPrice: 3000, 
            costPrice: 2800,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 5000,
            paymentMethod: 'CASH',
            reference: 'CSH-DEP-1024',
          },
        ],
      },
    },
  });

  // 9. Debt Repayments
  await prisma.debtRepayment.upsert({
    where: { repaymentNumber: 'REP-001' },
    update: {},
    create: {
      repaymentNumber: 'REP-001',
      customerId: customerGrace.id,
      amount: 18000,
      paymentMethod: 'CASH',
      reference: 'CSH-REP-GRACE',
      notes: 'Cleared previous balance in full',
      userId: owner.id,
      createdAt: new Date('2026-04-20'),
    },
  });

  // 10. Expenses
  await prisma.expense.createMany({
    data: [
      {
        category: 'Rent',
        description: 'Shop & Store monthly rent',
        amount: 25000,
        paymentMethod: 'BANK',
        userId: owner.id,
        reference: 'TX-RENT-APR',
        createdAt: new Date('2026-04-01'),
      },
      {
        category: 'Transport',
        description: 'Transport of dairy feed from depot',
        amount: 4500,
        paymentMethod: 'CASH',
        userId: operator.id,
        reference: 'VCH-TR-01',
        createdAt: new Date('2026-04-15'),
      },
      {
        category: 'Electricity',
        description: 'KPLC Token for shop lights and cooling',
        amount: 3200,
        paymentMethod: 'OTHER',
        userId: owner.id,
        reference: 'MPESA-ELEC-44',
        createdAt: new Date('2026-04-18'),
      },
      {
        category: 'Packaging',
        description: 'Printed carrier bags and sacks',
        amount: 2800,
        paymentMethod: 'CASH',
        userId: operator.id,
        reference: 'CSH-PKG-09',
        createdAt: new Date('2026-04-22'),
      },
    ],
    skipDuplicates: true,
  });

  // 11. Cancellation Requests matching mockup
  await prisma.cancellationRequest.upsert({
    where: { id: 'req-cancel-1023' },
    update: {},
    create: {
      id: 'req-cancel-1023',
      transactionType: 'SALE',
      transactionId: creditSale.id,
      saleId: creditSale.id,
      userId: operator.id,
      reason: 'Customer request to amend quantity before delivery',
      status: 'PENDING',
      createdAt: new Date('2026-04-28'),
    },
  });

  await prisma.cancellationRequest.upsert({
    where: { id: 'req-reverse-pur-87' },
    update: {},
    create: {
      id: 'req-reverse-pur-87',
      transactionType: 'PURCHASE',
      transactionId: 'PO-001',
      userId: owner.id,
      reason: 'Supplier delivered wrong grade feed',
      status: 'PENDING',
      createdAt: new Date('2026-04-28'),
    },
  });

  await prisma.cancellationRequest.upsert({
    where: { id: 'req-adjust-stock-peter' },
    update: {},
    create: {
      id: 'req-adjust-stock-peter',
      transactionType: 'ADJUSTMENT',
      transactionId: 'prod-pigfeed-50',
      userId: operator.id,
      reason: 'Damage sustained during warehouse handling',
      status: 'PENDING',
      createdAt: new Date('2026-04-27'),
    },
  });

  // 12. Optional Services & Commissions Module
  const empMary = await prisma.employee.upsert({
    where: { employeeCode: 'EMP-001' },
    update: {},
    create: {
      name: 'Mary Wanjiku',
      employeeCode: 'EMP-001',
      phone: '+254 712 990011',
      role: 'Stylist & Attendant',
      isActive: true,
    },
  });

  const empJohn = await prisma.employee.upsert({
    where: { employeeCode: 'EMP-002' },
    update: {},
    create: {
      name: 'John Mutua',
      employeeCode: 'EMP-002',
      phone: '+254 722 883344',
      role: 'Animal Health Specialist',
      isActive: true,
    },
  });

  const svcHair = await prisma.serviceType.upsert({
    where: { name: 'Hair Styling' },
    update: {},
    create: {
      name: 'Hair Styling',
      description: 'Professional wash, blowdry and hair styling',
      price: 800,
      commissionType: 'PERCENTAGE',
      defaultCommission: 20, 
    },
  });

  const svcFacial = await prisma.serviceType.upsert({
    where: { name: 'Facial Treatment' },
    update: {},
    create: {
      name: 'Facial Treatment',
      description: 'Herbal facial scrubbing and rejuvenation',
      price: 1500,
      commissionType: 'PERCENTAGE',
      defaultCommission: 25, // 25%
    },
  });

  // Seed 5 customer services for Mary Wanjiku matching mockup (Total: 6200, Commission: 1240)
  const serviceTxns = [
    { num: 'SRV-101', svc: svcHair, client: 'Alice Wambui', price: 800, commRate: 20, comm: 160 },
    { num: 'SRV-102', svc: svcFacial, client: 'Beatrice Akinyi', price: 1500, commRate: 25, comm: 375 },
    { num: 'SRV-103', svc: svcHair, client: 'Catherine Njoki', price: 800, commRate: 20, comm: 160 },
    { num: 'SRV-104', svc: svcFacial, client: 'Dorcas Chebet', price: 1500, commRate: 25, comm: 375 },
    { num: 'SRV-105', svc: svcHair, client: 'Esther Mwende', price: 1600, commRate: 20, comm: 170 }, // special styling
  ];

  for (const s of serviceTxns) {
    await prisma.serviceTransaction.upsert({
      where: { transactionNumber: s.num },
      update: {},
      create: {
        transactionNumber: s.num,
        customerName: s.client,
        employeeId: empMary.id,
        serviceTypeId: s.svc.id,
        amountCharged: s.price,
        amountPaid: s.price,
        paymentMethod: 'CASH',
        commissionRate: s.commRate,
        commissionEarned: s.comm,
        isCommissionPaid: false,
      },
    });
  }

  // 13. Notifications matching mockup
  await prisma.notification.createMany({
    data: [
      {
        title: 'Low Stock Alert',
        message: 'Dairy Meal 50kg has only 2 bags remaining!',
        type: 'DANGER',
      },
      {
        title: 'New Cancellation Request',
        message: 'Mary Wanjiku submitted a cancellation request for Sale #1023.',
        type: 'WARNING',
      },
      {
        title: 'Overdue Debt Notice',
        message: 'Peter Kamau has an overdue debt balance of KSh 25,000.',
        type: 'INFO',
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed completed successfully!');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
