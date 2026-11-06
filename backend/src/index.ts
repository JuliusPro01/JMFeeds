import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import inventoryRoutes from './routes/inventory';
import saleRoutes from './routes/sales';
import customerRoutes from './routes/customers';
import purchaseRoutes from './routes/purchases';
import debtRoutes from './routes/debts';
import expenseRoutes from './routes/expenses';
import dashboardRoutes from './routes/dashboard';
import analyticsRoutes from './routes/analytics';
import reportRoutes from './routes/reports';
import approvalRoutes from './routes/approvals';
import serviceRoutes from './routes/services';
import reconciliationRoutes from './routes/reconciliation';
import userRoutes from './routes/users';
import settingsRoutes from './routes/settings';
import notificationRoutes from './routes/notifications';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Simple structured request/audit-friendly logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api')) {
      console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
    }
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'JMFeeds Business Management System' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);

// Centralized error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`JMFeeds backend running on port ${PORT}`);
});
