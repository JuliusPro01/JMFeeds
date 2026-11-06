# JMFeeds — Business Management System

Complete management system for a business dealing in **animal feeds, cosmetics, retail/wholesale sales**, and an optional **cosmetic services & employee commissions** module.

Built from your mockup: JMFeeds green branding, dark-navy sidebar, white/light-blue surfaces, stat cards, POS, tables, and approvals — with real database-backed figures throughout.

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
├── backend/
│   ├── prisma/schema.prisma        # 30+ entities: users, products, sales, POs, debts,
│   │                               # approvals, audit log, daily closing, services...
│   └── src/
│       ├── index.ts                # Express app: mounts all 17 route modules
│       ├── seed.ts                 # Demo data (run once)
│       └── routes/
│           ├── auth.ts users.ts            # accounts, roles, permissions
│           ├── products.ts inventory.ts    # catalog, stock ledger
│           ├── purchases.ts                # purchase orders + goods receipts
│           ├── sales.ts                    # atomic POS checkout
│           ├── customers.ts debts.ts       # credit & repayments
│           ├── expenses.ts dashboard.ts analytics.ts reports.ts
│           ├── approvals.ts                # cancellation/reversal workflow
│           ├── services.ts                 # optional commissions module
│           ├── reconciliation.ts           # daily closing
│           └── settings.ts notifications.ts
└── frontend/
    └── src/
        ├── App.tsx theme.ts                    # routing + JMFeeds brand theme
        ├── components/ (Layout, Logo, ui)      # navy sidebar, stat cards, exports
        └── pages/ (16 pages)
            Landing · Login · Dashboard · POS · Inventory · Purchases
            Customers · Debts · Expenses · Reports · Analytics
            Approvals · Users · Services · Reconciliation · Settings
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

✅ **Public landing page** — JMFeeds hero, features, footer (mockup section 1)
✅ **Split-screen login** — green button, "Contact your administrator" (no public signup)
✅ **Dashboard** — Today's Sales / Purchases / Stock Value / Customer Debt / Gross & Net Profit cards, week sales-profit trend chart, low-stock alerts, pending approvals, quick actions
✅ **POS checkout** — walk-in vs registered customer, search/barcode, cart, discount, payment chips (Cash / Bank / Other), change & credit calculation, receipt
✅ **Inventory** — filters by category/status, Add/Edit product (SKU, barcode, batch, expiry, threshold), stock-status chips, per-product movement history
✅ **Purchasing** — Purchase orders (PENDING → PARTIALLY_RECEIVED → RECEIVED), **goods receipt updates inventory atomically** with batch/expiry, supplier management
✅ **Customers** — searchable list, VIP/Regular/Wholesale chips, full profile with purchases + repayments + statements
✅ **Debt management** — debtors table (credit/paid/balance/due/status), partial repayments that **reduce debt without creating revenue**, credit-limit data
✅ **Expenses** — categorized, filtered, CSV/Excel/PDF exports
✅ **Financial analytics** — per-product and per-category profitability, revenue vs collected vs credit, COGS, gross/net profit, receivables, payables, inventory valuation
✅ **Reports centre** — 6 tabs with date filters and working PDF / Excel / CSV downloads that reflect the filters
✅ **Approvals & reversals** — operator submits cancellation request; owner sees warning message before approving; approval runs a **single atomic transaction** that preserves the original, marks it REVERSED, restores stock with REVERSAL ledger movements, adjusts customer credit exactly once; operators cannot approve their own requests (403 at API level)
✅ **Users management** — owner creates operators, deactivates accounts, resets passwords, sees last login; all server-enforced
✅ **Optional services & commissions** — disabled by default (change in Settings → Optional Modules); employees, service types with %/fixed commission rules, per-customer service transactions, earned/paid/outstanding commission with traceability
✅ **Daily closing & reconciliation** — expected cash derived from ledger (cash sales + cash repayments − cash expenses), actual count entry, discrepancy recording, saved closing records
✅ **Notifications** — low stock, expiry, overdue debts, approval requests; de-duplicated so the same unresolved condition doesn't spam
✅ **Audit trail** — logins, user changes, expenses, reversals, repayments, settings — all recorded and queryable via the Audit report
✅ **Backend-enforced authorization** — operator calls to owner-only endpoints return 403 (tested)

### Financial integrity rules (verified end-to-end)
- A **sale**: records revenue + payment + receivable for unpaid amount + inventory deduction + COGS — atomically
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
Collect only the customer data needed (name, phone); the system stores no payment credentials — payment methods are manual records. Personal data lives only in your own PostgreSQL instance.

---

## Test Checklist (verified against the live API)

1. ✅ Sell stock → inventory deducted, SALE ledger movement written
2. ✅ Credit sale with partial payment → customer debt = balance
3. ✅ Repayment → debt decreases, no revenue created
4. ✅ Operator submits cancellation → PENDING; owner notified
5. ✅ Operator tries to approve own request → **403**
6. ✅ Owner approves → original preserved (status REVERSED), stock restored via REVERSAL movement, customer debt adjusted once
7. ✅ Operator tries to create a user → **403**
8. ✅ Dashboard/analytics figures derived from real records
9. ✅ Daily reconciliation computes expected cash from the ledger
