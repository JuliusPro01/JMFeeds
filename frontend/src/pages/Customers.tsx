import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Typography, TextField, MenuItem, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, Table, TableBody, TableCell, TableHead, TableRow, Snackbar, Alert, Chip,
} from '@mui/material';
import { Plus } from 'lucide-react';
import api from '../api/client';
import { fmt, fmtDate } from '../utils/format';
import { StatusChip, EmptyRow } from '../components/ui';

export default function Customers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [addDialog, setAddDialog] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', customerType: 'REGULAR', creditLimit: '0', notes: '' });
  const [snack, setSnack] = useState<{ msg: string; type: any } | null>(null);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await api.get('/customers')).data,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, creditLimit: Number(form.creditLimit) };
      return (await api.post('/customers', payload)).data;
    },
    onSuccess: () => { setAddDialog(false); setSnack({ msg: 'Customer registered', type: 'success' }); queryClient.invalidateQueries(); },
    onError: (e: any) => setSnack({ msg: e.response?.data?.error ?? 'Failed', type: 'error' }),
  });

  const filtered = customers.filter((c: any) => {
    const s = search.toLowerCase().trim();
    return !s || c.name.toLowerCase().includes(s) || c.phone.includes(s);
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2.5 }}>
      {/* List */}
      <Box flex={1.3}>
        <Paper sx={{ borderRadius: 2.5, p: { xs: 1.5, sm: 2.5 } }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', gap: 1, mb: 2 }}>
            <TextField size="small" placeholder="Search customer name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} fullWidth sx={{ maxWidth: { sm: 280 } }} />
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setAddDialog(true)} sx={{ whiteSpace: 'nowrap', alignSelf: { xs: 'stretch', sm: 'auto' } }}>Add Customer</Button>
          </Box>
          <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <Table size="small" sx={{ minWidth: 420 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 11.5 }}>Customer Name</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Type</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Status</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Debt</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((c: any) => (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{c.name}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{c.phone}</Typography>
                    </TableCell>
                    <TableCell><StatusChip status={c.customerType} /></TableCell>
                    <TableCell>
                      <Chip size="small" label={c.isActive ? 'Active' : 'Inactive'} sx={{ bgcolor: '#EAF7EF', color: '#1B7A3E', fontWeight: 700, fontSize: 10.5 }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: Number(c.outstandingDebt) > 0 ? 800 : 400, color: Number(c.outstandingDebt) > 0 ? '#C02828' : 'text.secondary' }}>
                      {fmt(c.outstandingDebt)}
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="text" onClick={() => setProfile(c)}>Profile</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && <EmptyRow colSpan={5} message="No customers found" />}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </Box>

      {/* Profile panel */}
      <Box flex={1}>
        {profile ? (
          <Paper sx={{ borderRadius: 2.5, p: 2.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 16 }}>Customer Profile</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 1.5 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: '#EAF7EF', color: '#23A455', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                {profile.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
              </Box>
              <Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography sx={{ fontWeight: 700 }}>{profile.name}</Typography>
                  <StatusChip status={profile.customerType} />
                </Box>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{profile.phone}</Typography>
              </Box>
            </Box>
            <CustomerProfilePanel customer={profile} onClose={() => setProfile(null)} />
          </Paper>
        ) : (
          <Paper sx={{ borderRadius: 2.5, p: 5, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Customer list, credit sales, repayments, and statements.
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Add dialog */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Register Customer</DialogTitle>
        <DialogContent sx={{ pt: '12px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField size="small" label="Full Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField size="small" label="Phone Number *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <TextField size="small" label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <TextField size="small" label="Address / Business Name" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField select size="small" label="Customer Type" value={form.customerType} onChange={(e) => setForm({ ...form, customerType: e.target.value })} fullWidth>
              {['REGULAR', 'VIP', 'WHOLESALE'].map((t) => <MenuItem key={t} value={t}>{t === 'VIP' ? 'Esteemed (VIP)' : t.charAt(0) + t.slice(1).toLowerCase()}</MenuItem>)}
            </TextField>
            <TextField size="small" type="number" label="Credit Limit" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} fullWidth />
          </Box>
          <TextField size="small" label="Notes" multiline rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(false)}>Cancel</Button>
          <Button variant="contained" disabled={!form.name || !form.phone || save.isPending} onClick={() => save.mutate()}>Save Customer</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack(null)}>
        <Alert severity={snack?.type} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

function CustomerProfilePanel({ customer, onClose }: { customer: any; onClose: () => void }) {
  const { data: statement } = useQuery({
    queryKey: ['customer-statement', customer.id],
    queryFn: async () => (await api.get(`/debts/statement/${customer.id}`)).data,
  });

  return (
    <Box>
      <Box sx={{ bgcolor: '#FDECEC', borderRadius: 2, p: 2, textAlign: 'center', my: 2 }}>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Outstanding Debt</Typography>
        <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#C02828' }}>{fmt(customer.outstandingDebt)}</Typography>
      </Box>

      <Typography sx={{ fontWeight: 700, fontSize: 13.5, mb: 0.5 }}>Purchase History</Typography>
      {(statement?.sales ?? []).slice(0, 6).map((s: any) => (
        <Box key={s.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.8, borderBottom: '1px solid #F0F4F8' }}>
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{s.invoiceNumber}</Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>{fmtDate(s.createdAt)} · {Number(s.items.length)} items{s.isCredit ? ' · Credit' : ''}</Typography>
          </Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{fmt(s.totalAmount)}</Typography>
        </Box>
      ))}

      <Typography sx={{ fontWeight: 700, fontSize: 13.5, mt: 2, mb: 0.5 }}>Repayments</Typography>
      {(statement?.repayments ?? []).slice(0, 6).map((r: any) => (
        <Box key={r.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.7, borderBottom: '1px solid #F0F4F8' }}>
          <Typography sx={{ fontSize: 12 }}>{fmtDate(r.createdAt)} · {r.paymentMethod}</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1B7A3E' }}>−{fmt(r.amount)}</Typography>
        </Box>
      ))}

      <Button fullWidth variant="outlined" sx={{ mt: 2 }} onClick={onClose}>Close Profile</Button>
    </Box>
  );
}
