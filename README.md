# JMFeeds â€” Business Management System

Complete management system for a business dealing in **animal feeds, cosmetics, retail/wholesale sales**, and an optional **cosmetic services & employee commissions** module.

Built from your mockup: JMFeeds green branding, dark-navy sidebar, white/light-blue surfaces, stat cards, POS, tables, and approvals â€” with real database-backed figures throughout.

---

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 18, TypeScript, Material UI v6, TanStack React Query, Zustand, Vite, Recharts, Lucide icons, jsPDF / ExcelJS |
| Backend   | Node.js, Express, TypeScript, Zod-style validation, JSON Web Tokens |
| Database  | PostgreSQL + Prisma ORM |
| Auth      | bcrypt password hashing, JWT sessions (12h), server-enforced role authorization |

---

## Project Structure

```
JMFeeds/
â”œâ”€â”€ backend/
â”‚   â”œâ”€â”€ prisma/schema.prisma        # 30+ entities: users, products, sales, POs, debts,
â”‚   â”‚                               # approvals, audit log, daily closing, services...
â”‚   â””â”€â”€ src/
â”‚       â”œâ”€â”€ index.ts                # Express app: mounts all 17 route modules
â”‚       â”œâ”€â”€ seed.ts                 # Demo data (run once)
â”‚       â””â”€â”€ routes/
â”‚           â”œâ”€â”€ auth.ts users.ts            # accounts, roles, permissions
â”‚           â”œâ”€â”€ products.ts inventory.ts    # catalog, stock ledger
â”‚           â”œâ”€â”€ purchases.ts                # purchase orders + goods receipts
â”‚           â”œâ”€â”€ sales.ts                    # atomic POS checkout
â”‚           â”œâ”€â”€ customers.ts debts.ts       # credit & repayments
â”‚           â”œâ”€â”€ expenses.ts dashboard.ts analytics.ts reports.ts
â”‚           â”œâ”€â”€ approvals.ts                # cancellation/reversal workflow
â”‚           â”œâ”€â”€ services.ts                 # optional commissions module
â”‚           â”œâ”€â”€ reconciliation.ts           # daily closing
â”‚           â””â”€â”€ settings.ts notifications.ts
â””â”€â”€ frontend/
    â””â”€â”€ src/
        â”œâ”€â”€ App.tsx theme.ts                    # routing + JMFeeds brand theme
        â”œâ”€â”€ components/ (Layout, Logo, ui)      # navy sidebar, stat cards, exports
        â””â”€â”€ pages/ (16 pages)
            Landing Â· Login Â· Dashboard Â· POS Â· Inventory Â· Purchases
            Customers Â· Debts Â· Expenses Â· Reports Â· Analytics
            Approvals Â· Users Â· Services Â· Reconciliation Â· Settings
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL running locally (adjust credentials below)

### 1. Configure environment

`backend/.env`:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/jmfeeds?schema=public"
PORT=3000
JWT_SECRET="choose-a-long-random-secret"
```

### 2. Database
```bash
cd backend
npm install
npx prisma db push        # create/refresh all tables
npx prisma generate       # generate Prisma client
npx ts-node src/seed.ts   # demo data: products, customers, POs, sales,
                          # debts, expenses, approvals, services, notifications
```

### 3. Run the backend
```bash
npm run dev               # development (auto-reload, port 3000)
npm run build && npm start  # production (runs dist)
```

### 4. Run the frontend
```bash
cd ../frontend
npm install
npm run dev               # http://localhost:5173
npm run build             # production bundle in dist/
```

### Demo accounts (created by the seed)

| Role     | Username   | Password    |
|----------|------------|-------------|
| Owner    | `owner`    | `admin123`  |
| Operator | `operator` | `operator123` |

> Change these in production. New operator accounts are created by the owner under **Users**.

---

## What Is Implemented

âœ… **Public landing page** â€” JMFeeds hero, features, footer (mockup section 1)
âœ… **Split-screen login** â€” green button, "Contact your administrator" (no public signup)
âœ… **Dashboard** â€” Today's Sales / Purchases / Stock Value / Customer Debt / Gross & Net Profit cards, week sales-profit trend chart, low-stock alerts, pending approvals, quick actions
âœ… **POS checkout** â€” walk-in vs registered customer, search/barcode, cart, discount, payment chips (Cash / Bank / Other), change & credit calculation, receipt
âœ… **Inventory** â€” filters by category/status, Add/Edit product (SKU, barcode, batch, expiry, threshold), stock-status chips, per-product movement history
âœ… **Purchasing** â€” Purchase orders (PENDING â†’ PARTIALLY_RECEIVED â†’ RECEIVED), **goods receipt updates inventory atomically** with batch/expiry, supplier management
âœ… **Customers** â€” searchable list, VIP/Regular/Wholesale chips, full profile with purchases + repayments + statements
âœ… **Debt management** â€” debtors table (credit/paid/balance/due/status), partial repayments that **reduce debt without creating revenue**, credit-limit data
âœ… **Expenses** â€” categorized, filtered, CSV/Excel/PDF exports
âœ… **Financial analytics** â€” per-product and per-category profitability, revenue vs collected vs credit, COGS, gross/net profit, receivables, payables, inventory valuation
âœ… **Reports centre** â€” 6 tabs with date filters and working PDF / Excel / CSV downloads that reflect the filters
âœ… **Approvals & reversals** â€” operator submits cancellation request; owner sees warning message before approving; approval runs a **single atomic transaction** that preserves the original, marks it REVERSED, restores stock with REVERSAL ledger movements, adjusts customer credit exactly once; operators cannot approve their own requests (403 at API level)
âœ… **Users management** â€” owner creates operators, deactivates accounts, resets passwords, sees last login; all server-enforced
âœ… **Optional services & commissions** â€” disabled by default (change in Settings â†’ Optional Modules); employees, service types with %/fixed commission rules, per-customer service transactions, earned/paid/outstanding commission with traceability
âœ… **Daily closing & reconciliation** â€” expected cash derived from ledger (cash sales + cash repayments âˆ’ cash expenses), actual count entry, discrepancy recording, saved closing records
âœ… **Notifications** â€” low stock, expiry, overdue debts, approval requests; de-duplicated so the same unresolved condition doesn't spam
âœ… **Audit trail** â€” logins, user changes, expenses, reversals, repayments, settings â€” all recorded and queryable via the Audit report
âœ… **Backend-enforced authorization** â€” operator calls to owner-only endpoints return 403 (tested)

### Financial integrity rules (verified end-to-end)
- A **sale**: records revenue + payment + receivable for unpaid amount + inventory deduction + COGS â€” atomically
- A **debt repayment**: records payment, reduces customer debt, creates **no** new sales revenue
- A **goods receipt**: increases inventory with the actual purchase cost; a PO alone never moves stock
- An **expense**: affects profitability only, never inventory
- An **approved reversal**: preserving original + exactly-once balance corrections

---

## Production Deployment Notes

1. **Environment**: set a strong `JWT_SECRET`; never expose DB credentials to the frontend.
2. **Build**: `backend: npm run build && npm start`; `frontend: npm run build` then serve `dist/` behind nginx or any static host with `/api` proxied to the backend.
3. **HTTPS** required in production (basis of trust; passwords are always hashed with bcrypt regardless).
4. **Backups**: schedule daily `pg_dump jmfeeds > backup_$(date +%F).sql` and keep off-machine copies. Verify restore monthly:
   `psql -d jmfeeds_restore < backup.sql`
5. **Scaling**: PostgreSQL connection pooling via Prisma; the schema indexes key lookups (`@unique` constraint fields).

## Kenyan Data Protection Notes
Collect only the customer data needed (name, phone); the system stores no payment credentials â€” payment methods are manual records. Personal data lives only in your own PostgreSQL instance.

---

## Test Checklist (verified against the live API)

1. âœ… Sell stock â†’ inventory deducted, SALE ledger movement written
2. âœ… Credit sale with partial payment â†’ customer debt = balance
3. âœ… Repayment â†’ debt decreases, no revenue created
4. âœ… Operator submits cancellation â†’ PENDING; owner notified
5. âœ… Operator tries to approve own request â†’ **403**
6. âœ… Owner approves â†’ original preserved (status REVERSED), stock restored via REVERSAL movement, customer debt adjusted once
7. âœ… Operator tries to create a user â†’ **403**
8. âœ… Dashboard/analytics figures derived from real records
9. âœ… Daily reconciliation computes expected cash from the ledger
