import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Tab,
} from '@mui/material';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, Legend, CartesianGrid,
} from 'recharts';
import api from '../api/client';
import { fmt } from '../utils/format';
import { PageLoading } from '../components/ui';

export default function Analytics() {
  const [tab, setTab] = useState(0);
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => (await api.get('/analytics/profitability')).data,
  });

  if (isLoading || !data) return <PageLoading />;
  const o = data.overview;

  return (
    <Box>
      {/* Overall overview KPIs */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2, mb: 2.5 }}>
        {[
          { label: 'Sales Revenue', value: o.totalRevenue, color: '#123A52' },
          { label: 'Amount Collected', value: o.amountCollected, color: '#23A455' },
          { label: 'Credit Sales', value: o.creditSales, color: '#F2994A' },
          { label: 'Gross Profit', value: o.grossProfit, color: '#1B7A3E' },
          { label: 'Net Profit', value: o.netProfit, color: o.netProfit >= 0 ? '#1B7A3E' : '#E23B3B' },
          { label: 'Cost of Goods Sold', value: o.totalCOGS, color: '#6B7C93' },
          { label: 'Operating Expenses', value: o.operatingExpenses, color: '#E23B3B' },
          { label: 'Outstanding Debts', value: o.outstandingDebts, color: '#E23B3B' },
          { label: 'Supplier Payables', value: o.supplierPayables, color: '#2D9CDB' },
          { label: 'Inventory Valuation', value: o.inventoryValuation, color: '#7C5CBF' },
        ].map((k) => (
          <Paper key={k.label} sx={{ borderRadius: 2, p: 1.6 }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{k.label}</Typography>
            <Typography sx={{ fontSize: 15.5, fontWeight: 800, color: k.color }}>{fmt(k.value)}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Total profit card */}
      <Paper sx={{ borderRadius: 2.5, p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Total Profit</Typography>
          <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#1B7A3E' }}>{fmt(o.grossProfit)}</Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
            Net after expenses: <b style={{ color: o.netProfit >= 0 ? '#23A455' : '#E23B3B' }}>{fmt(o.netProfit)}</b>
          </Typography>
        </Box>
      </Paper>

      {/* Tabs: Products / Categories / Financial */}
      <Paper sx={{ borderRadius: 2.5, px: 1, mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Products" />
          <Tab label="Categories" />
          <Tab label="Top Products Chart" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Paper sx={{ borderRadius: 2.5, p: 2.5 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 11.5 }}>Product</TableCell>
                <TableCell sx={{ fontSize: 11.5 }}>Category</TableCell>
                <TableCell sx={{ fontSize: 11.5 }}>Sold</TableCell>
                <TableCell sx={{ fontSize: 11.5 }}>Revenue</TableCell>
                <TableCell sx={{ fontSize: 11.5 }}>COGS</TableCell>
                <TableCell sx={{ fontSize: 11.5 }}>Gross Profit</TableCell>
                <TableCell sx={{ fontSize: 11.5 }}>Margin</TableCell>
                <TableCell sx={{ fontSize: 11.5 }}>Stock Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.productProfitability.map((p: any) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{p.name}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{p.category}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{p.qtySold}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{fmt(p.revenue)}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{fmt(p.cogs)}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: p.grossProfit >= 0 ? '#1B7A3E' : '#C02828', fontWeight: 700 }}>{fmt(p.grossProfit)}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{p.margin}%</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{fmt(p.stockValuation)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {tab === 1 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
          {data.categoryProfitability.map((c: any) => (
            <Paper key={c.name} sx={{ borderRadius: 2.5, p: 2.5 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{c.name}</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
                <Box><Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Revenue</Typography><Typography sx={{ fontWeight: 800 }}>{fmt(c.revenue)}</Typography></Box>
                <Box><Typography sx={{ fontSize: 11, color: 'text.secondary' }}>COGS</Typography><Typography sx={{ fontWeight: 800 }}>{fmt(c.cogs)}</Typography></Box>
                <Box><Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Gross Profit</Typography><Typography sx={{ fontWeight: 800, color: '#1B7A3E' }}>{fmt(c.profit)}</Typography></Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {tab === 2 && (
        <Paper sx={{ borderRadius: 2.5, p: 2.5 }}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EDF2F7" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#8AA3B8' }} tickFormatter={(v) => `${v / 1000}k`} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#47607A' }} width={110} axisLine={false} tickLine={false} />
              <ChartTooltip formatter={(v: any) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Revenue" fill="#2D9CDB" radius={[0, 4, 4, 0]} barSize={14} />
              <Bar dataKey="profit" name="Profit" fill="#23A455" radius={[0, 4, 4, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}
    </Box>
  );
}
