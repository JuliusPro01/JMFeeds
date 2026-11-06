import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Snackbar, Alert, Chip, Grid,
  IconButton, Tooltip, Divider,
} from '@mui/material';
import { Plus, HandCoins, Pencil, Trash2 } from 'lucide-react';
import api from '../api/client';
import { fmt, fmtDate } from '../utils/format';
import { EmptyRow } from '../components/ui';

export default function Services() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const [txnDialog, setTxnDialog] = useState(false);
  const [empDialog, setEmpDialog] = useState(false);
  const [typeDialog, setTypeDialog] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [payDialog, setPayDialog] = useState<any>(null);
  const [snack, setSnack] = useState<{ msg: string; type: any } | null>(null);

  const [txnForm, setTxnForm] = useState({ employeeId: '', serviceTypeId: '', customerName: '', amountCharged: '', amountPaid: '', paymentMethod: 'CASH' });
  const [empForm, setEmpForm] = useState({ name: '', phone: '', role: '' });
  const [typeForm, setTypeForm] = useState({ name: '', description: '', price: '', commissionType: 'PERCENTAGE', defaultCommission: '20' });
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK' | 'OTHER'>('CASH');
  const [payNotes, setPayNotes] = useState('');

  const { data: employees = [] } = useQuery({ queryKey: ['service-employees'], queryFn: async () => (await api.get('/services/employees')).data });
  const { data: types = [] } = useQuery({ queryKey: ['service-types'], queryFn: async () => (await api.get('/services/types')).data });
  const { data: txns = [] } = useQuery({ queryKey: ['service-txns'], queryFn: async () => (await api.get('/services/transactions')).data });

  const selectedType = types.find((t: any) => t.id === txnForm.serviceTypeId);

  const openAddType = () => {
    setEditingType(null);
    setTypeForm({ name: '', description: '', price: '', commissionType: 'PERCENTAGE', defaultCommission: '20' });
    setTypeDialog(true);
  };

  const openEditType = (t: any) => {
    setEditingType(t);
    setTypeForm({
      name: t.name || '',
      description: t.description || '',
      price: String(t.price ?? ''),
      commissionType: t.commissionType || 'PERCENTAGE',
      defaultCommission: String(t.defaultCommission ?? '20'),
    });
    setTypeDialog(true);
  };

  const saveType = useMutation({
    mutationFn: async () => {
      const payload = {
        name: typeForm.name.trim(),
        description: typeForm.description.trim() || undefined,
        price: Number(typeForm.price),
        commissionType: typeForm.commissionType,
        defaultCommission: Number(typeForm.defaultCommission || 0),
      };
      if (editingType) {
        return (await api.put(`/services/types/${editingType.id}`, payload)).data;
      } else {
        return (await api.post('/services/types', payload)).data;
      }
    },
    onSuccess: () => {
      setTypeDialog(false);
      setSnack({ msg: editingType ? 'Service type updated' : 'New service created successfully', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
    },
    onError: (e: any) => setSnack({ msg: e.response?.data?.error ?? 'Failed to save service', type: 'error' }),
  });

  const deleteType = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/services/types/${id}`)).data,
    onSuccess: () => {
      setSnack({ msg: 'Service type removed', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
    },
    onError: (e: any) => setSnack({ msg: e.response?.data?.error ?? 'Failed to delete service', type: 'error' }),
  });

  const saveTxn = useMutation({
    mutationFn: async () => {
      const payload = { ...txnForm, amountCharged: Number(txnForm.amountCharged), amountPaid: Number(txnForm.amountPaid || txnForm.amountCharged) };
      return (await api.post('/services/transactions', payload)).data;
    },
    onSuccess: () => { setTxnDialog(false); setSnack({ msg: 'Service recorded — commission updated', type: 'success' }); queryClient.invalidateQueries(); },
    onError: (e: any) => setSnack({ msg: e.response?.data?.error ?? 'Failed', type: 'error' }),
  });

  const saveEmp = useMutation({
    mutationFn: async () => (await api.post('/services/employees', empForm)).data,
    onSuccess: () => { setEmpDialog(false); setEmpForm({ name: '', phone: '', role: '' }); setSnack({ msg: 'Employee registered', type: 'success' }); queryClient.invalidateQueries(); },
    onError: (e: any) => setSnack({ msg: e.response?.data?.error ?? 'Failed', type: 'error' }),
  });

  const payCommission = useMutation({
    mutationFn: async () =>
      (await api.post('/services/commissions/pay', {
        employeeId: payDialog.id,
        amount: Number(payAmount),
        paymentMethod: payMethod,
        notes: payNotes,
      })).data,
    onSuccess: (res: any) => {
      const remaining = res?.remainingBalance !== undefined
        ? res.remainingBalance
        : Math.max(0, Number(payDialog?.outstandingCommission) - Number(payAmount));
      setPayDialog(null);
      setPayAmount('');
      setPayNotes('');
      setSnack({
        msg: `Payment of ${fmt(payAmount)} recorded for ${payDialog?.name}. Remaining balance: ${fmt(remaining)}`,
        type: 'success',
      });
      queryClient.invalidateQueries();
    },
    onError: (e: any) => setSnack({ msg: e.response?.data?.error ?? 'Failed', type: 'error' }),
  });

  return (
    <Box>
      <Paper sx={{ borderRadius: 2.5, px: 1, mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label="All" />
          <Tab label="Employees" />
          <Tab label="Services" />
          <Tab label="Transactions" />
        </Tabs>
      </Paper>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ borderRadius: 2, p: 2 }}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Total Service Revenue</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 20 }}>{fmt(employees.reduce((a: number, e: any) => a + e.totalService, 0))}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ borderRadius: 2, p: 2 }}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Commission Earned</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 20 }}>{fmt(employees.reduce((a: number, e: any) => a + e.totalCommission, 0))}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ borderRadius: 2, p: 2 }}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Outstanding Commission</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 20, color: '#C02828' }}>{fmt(employees.reduce((a: number, e: any) => a + e.outstandingCommission, 0))}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Employees summary  */}
      {(tab === 0 || tab === 1) && (
        <Paper sx={{ borderRadius: 2.5, p: { xs: 1.5, sm: 2.5 }, mb: 2.5 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1.5, mb: 2 }}>
            <Typography sx={{ fontWeight: 700 }}>Employee Summaries</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button size="small" variant="outlined" startIcon={<Plus size={13} />} onClick={() => setEmpDialog(true)}>Add Employee</Button>
              <Button size="small" variant="outlined" startIcon={<Plus size={13} />} onClick={openAddType}>Add Service</Button>
              <Button size="small" variant="contained" onClick={() => setTxnDialog(true)}>Record Service</Button>
            </Box>
          </Box>
          <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <Table size="small" sx={{ minWidth: 680 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 11.5 }}>Employee</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Customers Served</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Total Service</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Commission Earned</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Commission Paid</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Outstanding</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((e: any) => (
                  <TableRow key={e.id} hover>
                    <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{e.name} <Typography component="span" sx={{ fontSize: 10.5, color: 'text.secondary' }}>({e.employeeCode})</Typography></TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{e.customersServed}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmt(e.totalService)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmt(e.totalCommission)}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#1B7A3E' }}>{fmt(e.commissionPaid)}</TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 800, color: '#C02828' }}>{fmt(e.outstandingCommission)}</TableCell>
                    <TableCell align="right">
                      {e.outstandingCommission > 0 ? (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<HandCoins size={14} />}
                          onClick={() => {
                            setPayDialog(e);
                            setPayAmount(String(e.outstandingCommission));
                            setPayMethod('CASH');
                            setPayNotes('');
                          }}
                        >
                          Pay / Advance
                        </Button>
                      ) : (
                        <Chip size="small" label="Fully Paid ✓" sx={{ bgcolor: '#EAF7EF', color: '#1B7A3E', fontWeight: 700, fontSize: 11 }} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {employees.length === 0 && <EmptyRow colSpan={7} message="No employees registered" />}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* Service types */}
      {(tab === 0 || tab === 2) && (
        <Paper sx={{ borderRadius: 2.5, p: { xs: 1.5, sm: 2.5 }, mb: 2.5 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1.5, mb: 2 }}>
            <Box>
              <Typography sx={{ fontWeight: 700 }}>Service Types & Commission Rules</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Define cosmetic and salon/feed services, set base prices, and employee commissions</Typography>
            </Box>
            <Button size="small" variant="contained" startIcon={<Plus size={14} />} onClick={openAddType}>Add Service</Button>
          </Box>
          <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <Table size="small" sx={{ minWidth: 580 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 11.5 }}>Service Name</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Description</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Price</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Commission</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Status</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {types.map((t: any) => (
                  <TableRow key={t.id} hover>
                    <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{t.name}</TableCell>
                    <TableCell sx={{ fontSize: 11.5, color: 'text.secondary' }}>{t.description || '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmt(t.price)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {t.commissionType === 'PERCENTAGE' ? `${Number(t.defaultCommission)}%` : fmt(t.defaultCommission)}
                    </TableCell>
                    <TableCell><Chip size="small" label="Active" sx={{ bgcolor: '#EAF7EF', color: '#1B7A3E', fontWeight: 700, fontSize: 10.5 }} /></TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit Service">
                        <IconButton size="small" onClick={() => openEditType(t)}><Pencil size={14} /></IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Service">
                        <IconButton size="small" color="error" onClick={() => { if (window.confirm(`Delete service "${t.name}"?`)) deleteType.mutate(t.id); }}><Trash2 size={14} /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {types.length === 0 && <EmptyRow colSpan={6} message="No service types found. Click 'Add Service' to create one." />}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* Transactions */}
      {(tab === 0 || tab === 3) && (
        <Paper sx={{ borderRadius: 2.5, p: { xs: 1.5, sm: 2.5 } }}>
          <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Customer Service Transactions</Typography>
          <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <Table size="small" sx={{ minWidth: 680 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 11.5 }}>Ref</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Date</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Customer</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Employee</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Service</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Charged</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Commission</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {txns.map((t: any) => (
                  <TableRow key={t.id} hover>
                    <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{t.transactionNumber}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmtDate(t.createdAt)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{t.customerName}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{t.employee?.name}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{t.serviceType?.name}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmt(t.amountCharged)}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#1B7A3E', fontWeight: 700 }}>{fmt(t.commissionEarned)}</TableCell>
                  </TableRow>
                ))}
                {txns.length === 0 && <EmptyRow colSpan={7} message="No services recorded" />}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* Record service dialog */}
      <Dialog open={txnDialog} onClose={() => setTxnDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Record Customer Service</DialogTitle>
        <DialogContent sx={{ pt: '12px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField select size="small" label="Employee" value={txnForm.employeeId} onChange={(e) => setTxnForm({ ...txnForm, employeeId: e.target.value })}>
            {employees.map((e: any) => <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Service" value={txnForm.serviceTypeId}
            onChange={(e) => {
              const t = types.find((x: any) => x.id === e.target.value);
              setTxnForm({ ...txnForm, serviceTypeId: e.target.value, amountCharged: t ? String(t.price) : txnForm.amountCharged, amountPaid: t ? String(t.price) : '' });
            }}>
            {types.map((t: any) => <MenuItem key={t.id} value={t.id}>{t.name} — {fmt(t.price)}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Customer Name (optional)" value={txnForm.customerName} onChange={(e) => setTxnForm({ ...txnForm, customerName: e.target.value })} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField size="small" type="number" label="Amount Charged" value={txnForm.amountCharged} onChange={(e) => setTxnForm({ ...txnForm, amountCharged: e.target.value })} fullWidth />
            <TextField size="small" type="number" label="Amount Paid" value={txnForm.amountPaid} onChange={(e) => setTxnForm({ ...txnForm, amountPaid: e.target.value })} fullWidth />
          </Box>
          <TextField select size="small" label="Payment Method" value={txnForm.paymentMethod} onChange={(e) => setTxnForm({ ...txnForm, paymentMethod: e.target.value })}>
            {['CASH', 'BANK', 'OTHER'].map((m) => <MenuItem key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</MenuItem>)}
          </TextField>
          {selectedType && (
            <Alert severity="info" sx={{ fontSize: 12 }}>
              Commission: {selectedType.commissionType === 'PERCENTAGE' ? `${Number(selectedType.defaultCommission)}% of charged` : `${fmt(selectedType.defaultCommission)} fixed`}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTxnDialog(false)}>Cancel</Button>
          <Button variant="contained" disabled={!txnForm.employeeId || !txnForm.serviceTypeId || !txnForm.amountCharged || saveTxn.isPending} onClick={() => saveTxn.mutate()}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Add employee */}
      <Dialog open={empDialog} onClose={() => setEmpDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Register Employee</DialogTitle>
        <DialogContent sx={{ pt: '12px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField size="small" label="Name" value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })} />
          <TextField size="small" label="Phone" value={empForm.phone} onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })} />
          <TextField size="small" label="Role (e.g. Stylist)" value={empForm.role} onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmpDialog(false)}>Cancel</Button>
          <Button variant="contained" disabled={!empForm.name || saveEmp.isPending} onClick={() => saveEmp.mutate()}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Pay commission / advance dialog */}
      <Dialog open={!!payDialog} onClose={() => setPayDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Record Commission Payout / Advance — {payDialog?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: '12px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Summary Box */}
          <Box sx={{ p: 2, bgcolor: '#F5F9FC', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Total Commission Earned:</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{fmt(payDialog?.totalCommission)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Already Paid So Far:</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1B7A3E' }}>{fmt(payDialog?.commissionPaid)}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 800 }}>Current Outstanding Balance:</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: '#C02828' }}>{fmt(payDialog?.outstandingCommission)}</Typography>
            </Box>
          </Box>

          {/* Quick preset buttons */}
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1, color: 'text.secondary' }}>
              Quick Presets:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setPayAmount(String(payDialog?.outstandingCommission));
                  setPayNotes('Full commission clearance');
                }}
              >
                Full Balance ({fmt(payDialog?.outstandingCommission)})
              </Button>
              {Number(payDialog?.outstandingCommission) >= 200 && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setPayAmount('200');
                    setPayNotes('Lunch / Midday advance');
                  }}
                >
                  Lunch Advance (KSh 200)
                </Button>
              )}
              {Number(payDialog?.outstandingCommission) >= 500 && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setPayAmount('500');
                    setPayNotes('Partial commission advance');
                  }}
                >
                  Advance (KSh 500)
                </Button>
              )}
              {Number(payDialog?.outstandingCommission) > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const half = Math.round(Number(payDialog?.outstandingCommission) / 2);
                    setPayAmount(String(half));
                    setPayNotes('50% Partial payout');
                  }}
                >
                  50% Partial ({fmt(Math.round(Number(payDialog?.outstandingCommission) / 2))})
                </Button>
              )}
            </Box>
          </Box>

          {/* Custom amount */}
          <TextField
            size="small"
            type="number"
            label="Amount to Pay (KSh) *"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            fullWidth
            required
            helperText={
              Number(payAmount) > Number(payDialog?.outstandingCommission) ? (
                <Typography component="span" sx={{ color: '#C02828', fontSize: 12, fontWeight: 700 }}>
                  ⚠️ Cannot exceed current outstanding balance ({fmt(payDialog?.outstandingCommission)})
                </Typography>
              ) : Number(payAmount) > 0 ? (
                `Remaining balance after this payment: ${fmt(Math.max(0, Number(payDialog?.outstandingCommission) - Number(payAmount)))}`
              ) : (
                'Enter full amount or any partial advance amount'
              )
            }
          />

          {/* Payment Method */}
          <TextField
            select
            size="small"
            label="Payment Method"
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value as any)}
            fullWidth
          >
            <MenuItem value="CASH">💵 Cash (From Shop Till Drawer)</MenuItem>
            <MenuItem value="BANK">📱 M-Pesa / Bank Transfer</MenuItem>
            <MenuItem value="OTHER">⚡ Other</MenuItem>
          </TextField>

          {/* Notes / Reason */}
          <TextField
            size="small"
            label="Payment Notes / Reason (Optional)"
            placeholder="e.g. Lunch advance, midday payout, final closing balance"
            value={payNotes}
            onChange={(e) => setPayNotes(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setPayDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              !payAmount ||
              Number(payAmount) <= 0 ||
              Number(payAmount) > Number(payDialog?.outstandingCommission) ||
              payCommission.isPending
            }
            onClick={() => payCommission.mutate()}
          >
            {Number(payAmount) === Number(payDialog?.outstandingCommission)
              ? `Pay Full (${fmt(payAmount)})`
              : `Pay Partial Advance (${fmt(payAmount || 0)})`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add / Edit service type dialog */}
      <Dialog open={typeDialog} onClose={() => setTypeDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editingType ? 'Edit Service Type' : 'Add New Service'}</DialogTitle>
        <DialogContent sx={{ pt: '12px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            size="small"
            label="Service Name (e.g. Hair Braiding, Feed Milling)"
            value={typeForm.name}
            onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
            fullWidth
            required
            autoFocus
          />
          <TextField
            size="small"
            label="Description (optional)"
            value={typeForm.description}
            onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
            fullWidth
          />
          <TextField
            size="small"
            type="number"
            label="Base Price (KES)"
            value={typeForm.price}
            onChange={(e) => setTypeForm({ ...typeForm, price: e.target.value })}
            fullWidth
            required
          />
          <TextField
            select
            size="small"
            label="Commission Type"
            value={typeForm.commissionType}
            onChange={(e) => setTypeForm({ ...typeForm, commissionType: e.target.value })}
            fullWidth
          >
            <MenuItem value="PERCENTAGE">Percentage (%)</MenuItem>
            <MenuItem value="FIXED">Fixed Amount (KES)</MenuItem>
          </TextField>
          <TextField
            size="small"
            type="number"
            label={typeForm.commissionType === 'PERCENTAGE' ? 'Default Commission (%)' : 'Default Commission (KES)'}
            value={typeForm.defaultCommission}
            onChange={(e) => setTypeForm({ ...typeForm, defaultCommission: e.target.value })}
            fullWidth
            helperText={typeForm.commissionType === 'PERCENTAGE' ? 'E.g. 20 means 20% of service charge goes to employee' : 'Fixed KES amount paid per service to employee'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTypeDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!typeForm.name.trim() || !typeForm.price || saveType.isPending}
            onClick={() => saveType.mutate()}
          >
            {editingType ? 'Update' : 'Create Service'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack(null)}>
        <Alert severity={snack?.type} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
