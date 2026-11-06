import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Typography, Paper, TextField, Snackbar, Alert, Divider, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, MenuItem, Stack, InputAdornment,
} from '@mui/material';
import { CheckCircle2, History, ShieldCheck, Calendar, Clock, Search } from 'lucide-react';
import api from '../api/client';
import { fmt, fmtDate, fmtDateTime, todayISO } from '../utils/format';
import { EmptyRow } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';

function getYesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export default function Reconciliation() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const [date, setDate] = useState(todayISO());
  const [selectedOperator, setSelectedOperator] = useState<string>('ALL');
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyDiscrepancyFilter, setHistoryDiscrepancyFilter] = useState<'ALL' | 'SHORTAGE' | 'BALANCED' | 'SURPLUS'>('ALL');
  const [snack, setSnack] = useState<{ msg: string; type: any } | null>(null);

  // Fetch users for owner operator selection
  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => (await api.get('/users')).data,
    enabled: isOwner,
  });

  const queryUserId = isOwner
    ? (selectedOperator !== 'ALL' ? selectedOperator : '')
    : (user?.id || '');

  const { data, isLoading } = useQuery({
    queryKey: ['reconciliation', date, queryUserId],
    queryFn: async () => {
      const uParam = queryUserId ? `&userId=${queryUserId}` : '';
      return (await api.get(`/reconciliation/summary?date=${date}${uParam}`)).data;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ['reconciliation-history'],
    queryFn: async () => (await api.get('/reconciliation/history')).data,
  });

  const activeOperatorObj = isOwner
    ? users.find((u: any) => u.id === selectedOperator)
    : user;

  const operatorLabel = isOwner
    ? (selectedOperator === 'ALL' ? 'All Operators (Combined)' : activeOperatorObj?.fullName || 'Operator')
    : (user?.fullName || 'My Cash Drawer');

  const closeDay = useMutation({
    mutationFn: async () =>
      (await api.post('/reconciliation/close', {
        date,
        operatorName: operatorLabel,
        operatorId: selectedOperator !== 'ALL' ? selectedOperator : null,
        totalSales: data.totalSales,
        cashCollected: data.cashCollected,
        bankPayments: data.bankPayments,
        otherPayments: data.otherPayments,
        creditSales: data.creditSales,
        debtRepayments: data.debtRepayments,
        expenses: data.expenses,
        expectedCash: data.expectedCash,
        actualCash: Number(actualCash),
        notes,
      })).data,
    onSuccess: (res) => {
      queryClient.invalidateQueries();
      const balanced = Number(res.discrepancy) === 0;
      setSnack({
        msg: balanced
          ? `Day closed for ${res.operatorName} by ${res.closedBy} — cash balanced ✓`
          : `Day closed for ${res.operatorName} by ${res.closedBy} — discrepancy ${fmt(res.discrepancy)} recorded`,
        type: balanced ? 'success' : 'warning',
      });
    },
    onError: (e: any) => setSnack({ msg: e.response?.data?.error ?? 'Failed', type: 'error' }),
  });

  const rows: [string, string, string?][] = [
    ['Total Sales', fmt(data?.totalSales ?? 0), '#e21f2f'],
    ['Cash Collected', fmt(data?.cashCollected ?? 0), '#1B7A3E'],
    ['Bank Payments', fmt(data?.bankPayments ?? 0)],
    ['Other Payments', fmt(data?.otherPayments ?? 0)],
    ['Credit Sales (not collected)', fmt(data?.creditSales ?? 0), '#B26A00'],
    ['Debt Repayments Collected', fmt(data?.debtRepayments ?? 0), '#1B7A3E'],
    ['Expenses Paid', fmt(data?.expenses ?? 0), '#E23B3B'],
  ];

  const expected = Number(data?.expectedCash ?? 0);
  const actual = Number(actualCash || 0);
  const discrepancy = actual - expected;
  const hasClosing = !!data?.closingRecord;

  const isToday = date === todayISO();
  const isPast = date < todayISO();

  const filteredHistory = history.filter((h: any) => {
    const s = historySearch.toLowerCase().trim();
    const op = (h.operatorName || '').toLowerCase();
    const admin = (h.closedBy || '').toLowerCase();
    const notesStr = (h.notes || '').toLowerCase();
    const dateStr = fmtDate(h.date).toLowerCase();

    const matchesSearch = !s || op.includes(s) || admin.includes(s) || notesStr.includes(s) || dateStr.includes(s);

    const diff = Number(h.discrepancy || 0);
    let matchesFilter = true;
    if (historyDiscrepancyFilter === 'SHORTAGE') matchesFilter = diff < 0;
    else if (historyDiscrepancyFilter === 'BALANCED') matchesFilter = diff === 0;
    else if (historyDiscrepancyFilter === 'SURPLUS') matchesFilter = diff > 0;

    return matchesSearch && matchesFilter;
  });

  return (
    <Box>
      {/* Top Filter & Date Selection Bar */}
      <Paper sx={{ borderRadius: 2.5, p: 2, mb: 2.5, border: '1px solid #E3EBF3' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              type="date"
              label="Reconciliation Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              sx={{ width: 175 }}
              InputLabelProps={{ shrink: true }}
            />

            <Stack direction="row" spacing={0.8}>
              <Button
                size="small"
                variant={isToday ? 'contained' : 'outlined'}
                onClick={() => setDate(todayISO())}
                sx={{ textTransform: 'none', fontSize: 12, borderRadius: 1.5 }}
              >
                Today
              </Button>
              <Button
                size="small"
                variant={date === getYesterdayISO() ? 'contained' : 'outlined'}
                onClick={() => setDate(getYesterdayISO())}
                sx={{ textTransform: 'none', fontSize: 12, borderRadius: 1.5 }}
              >
                Yesterday
              </Button>
            </Stack>

            <TextField
              select
              size="small"
              label="Select Operator to Audit"
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              sx={{ minWidth: 240 }}
            >
              <MenuItem value="ALL">🏢 All Operators (Combined Total)</MenuItem>
              {users.map((u: any) => (
                <MenuItem key={u.id} value={u.id}>
                  👤 {u.fullName} ({u.role})
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={<ShieldCheck size={15} />}
              label={`Admin Auditor: ${user?.fullName || user?.username}`}
              color="success"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: 12 }}
            />
          </Box>
        </Box>

        {isPast && (
          <Alert severity="warning" sx={{ mt: 1.5, fontSize: 12 }}>
            <b>Reconciling Previous Date ({fmtDate(date)}):</b> You are auditing a past day. Transactions are strictly bounded to that calendar date without mixing with today's ongoing sales.
          </Alert>
        )}
      </Paper>

      {/* Main Closing Panels */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2.5 }}>
        <Paper sx={{ borderRadius: 2.5, p: 2.5, flex: 1, border: '1px solid #E3EBF3' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
              Daily Ledger Breakdown ({operatorLabel})
            </Typography>
            <Chip size="small" label={fmtDate(date)} sx={{ fontSize: 11.5, fontWeight: 700 }} />
          </Box>

          {rows.map(([label, value, color]) => (
            <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #F0F4F8' }}>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{label}</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: color ?? '#172B3A' }}>{value}</Typography>
            </Box>
          ))}
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800 }}>Expected Cash Balance</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#1B7A3E' }}>{fmt(expected)}</Typography>
          </Box>
          <Alert severity="info" sx={{ mt: 1.5, fontSize: 12 }}>
            Expected cash = cash sales + debt repayments received − cash expenses for {fmtDate(date)}. Enter your physical count on the right.
          </Alert>
        </Paper>

        <Paper sx={{ borderRadius: 2.5, p: 2.5, flex: 1, border: '1px solid #E3EBF3' }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.5 }}>
            Counted Cash ({operatorLabel})
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
            Owner/Admin audits the physical cash envelope for {fmtDate(date)}.
          </Typography>

          <TextField
            size="small"
            fullWidth
            type="number"
            label="Actual Cash Counted (KSh)"
            value={actualCash}
            onChange={(e) => setActualCash(e.target.value)}
            sx={{ mb: 1.5 }}
          />

          {actualCash !== '' && (
            <Box sx={{ mb: 1.5, p: 1.6, borderRadius: 2, bgcolor: discrepancy === 0 ? '#EAF7EF' : '#FFF6E9', textAlign: 'center' }}>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Discrepancy</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: 19, color: discrepancy === 0 ? '#1B7A3E' : (discrepancy < 0 ? '#C02828' : '#B26A00') }}>
                {fmt(discrepancy)} {discrepancy === 0 ? '— Balanced ✓' : discrepancy > 0 ? '(Surplus)' : '(Shortage)'}
              </Typography>
            </Box>
          )}

          <TextField
            size="small"
            fullWidth
            multiline
            rows={2}
            label="Admin Notes / Audit Explanation"
            placeholder="e.g. Verified by owner, shortage docked from operator, balance verified"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Button
            fullWidth
            variant="contained"
            size="large"
            sx={{ py: 1.3 }}
            disabled={actualCash === '' || closeDay.isPending}
            onClick={() => closeDay.mutate()}
          >
            {hasClosing
              ? `Update Closing for ${operatorLabel} (${fmtDate(date)})`
              : `Confirm & Close Day for ${operatorLabel} (${fmtDate(date)})`}
          </Button>

          {hasClosing && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#F5F9FC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle2 size={15} color="#23A455" /> Audit Saved for {data.closingRecord.operatorName}
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                Status: <Chip size="small" label={data.closingRecord.status} sx={{ fontWeight: 700 }} />
                {' '}· Counted: {fmt(data.closingRecord.actualCash)} · Closed by Admin: <b>{data.closingRecord.closedBy}</b>
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Daily Closing & Operator Shortages History Log */}
      <Paper sx={{ borderRadius: 2.5, p: { xs: 1.5, sm: 2.5 }, mt: 3, border: '1px solid #E3EBF3' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <History size={18} color="#23A455" />
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>Closing & Shortage Audit History Log</Typography>
        </Box>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
          Official register showing audited date, operator name, closing admin name, expected vs counted cash, and shortages.
        </Typography>

        {/* Search & Filter Toolbar for Closing History */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2, alignItems: 'center', justifyContent: 'space-between' }}>
          <TextField
            size="small"
            placeholder="Search by operator, admin, date, or notes..."
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            sx={{ minWidth: 260, flex: { xs: '1 1 100%', sm: '0 1 340px' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} color="#627D98" />
                </InputAdornment>
              ),
            }}
          />

          <Stack direction="row" spacing={0.8} sx={{ flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant={historyDiscrepancyFilter === 'ALL' ? 'contained' : 'outlined'}
              onClick={() => setHistoryDiscrepancyFilter('ALL')}
              sx={{ textTransform: 'none', fontSize: 11.5, borderRadius: 1.5 }}
            >
              All Records ({history.length})
            </Button>
            <Button
              size="small"
              variant={historyDiscrepancyFilter === 'SHORTAGE' ? 'contained' : 'outlined'}
              color="error"
              onClick={() => setHistoryDiscrepancyFilter('SHORTAGE')}
              sx={{ textTransform: 'none', fontSize: 11.5, borderRadius: 1.5 }}
            >
              Shortages Only 🔴
            </Button>
            <Button
              size="small"
              variant={historyDiscrepancyFilter === 'BALANCED' ? 'contained' : 'outlined'}
              color="success"
              onClick={() => setHistoryDiscrepancyFilter('BALANCED')}
              sx={{ textTransform: 'none', fontSize: 11.5, borderRadius: 1.5 }}
            >
              Balanced Only 🟢
            </Button>
          </Stack>
        </Box>

        <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <Table size="small" sx={{ minWidth: 860 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Audit Date</TableCell>
                <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Operator (Audited)</TableCell>
                <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Closed By (Admin)</TableCell>
                <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Total Sales</TableCell>
                <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Expected Cash</TableCell>
                <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Counted Cash</TableCell>
                <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Variance / Shortage</TableCell>
                <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Admin Notes</TableCell>
                <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Closed At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredHistory.map((h: any) => {
                const diff = Number(h.discrepancy || 0);
                const isShortage = diff < 0;
                const isSurplus = diff > 0;
                const isBalanced = diff === 0;
                return (
                  <TableRow key={h.id} hover>
                    <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{fmtDate(h.date)}</TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{h.operatorName || 'All Operators'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      <Chip
                        size="small"
                        icon={<ShieldCheck size={12} />}
                        label={h.closedBy || 'Admin'}
                        sx={{ bgcolor: '#EAF7EF', color: '#1B7A3E', fontWeight: 600, fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmt(h.totalSales)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmt(h.expectedCash)}</TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{fmt(h.actualCash)}</TableCell>
                    <TableCell>
                      {isBalanced && (
                        <Chip size="small" label="Balanced ✓" sx={{ bgcolor: '#EAF7EF', color: '#1B7A3E', fontWeight: 700, fontSize: 11 }} />
                      )}
                      {isShortage && (
                        <Chip size="small" label={`${fmt(diff)} Shortage`} sx={{ bgcolor: '#FDE8E8', color: '#C02828', fontWeight: 800, fontSize: 11 }} />
                      )}
                      {isSurplus && (
                        <Chip size="small" label={`+${fmt(diff)} Surplus`} sx={{ bgcolor: '#FFF6E9', color: '#B26A00', fontWeight: 800, fontSize: 11 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={h.status} sx={{ fontSize: 10.5, fontWeight: 600 }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5, color: 'text.secondary', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {h.notes || '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>
                      {h.createdAt ? fmtDateTime(h.createdAt) : fmtDate(h.date)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredHistory.length === 0 && <EmptyRow colSpan={10} message="No matching daily closing audit records found" />}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {snack && (
        <Snackbar open autoHideDuration={4500} onClose={() => setSnack(null)}>
          <Alert severity={snack.type} onClose={() => setSnack(null)}>
            {snack.msg}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
}
