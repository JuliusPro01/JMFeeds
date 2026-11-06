import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Chip, Typography, TextField, MenuItem, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Tab, Snackbar, Alert, IconButton,
} from '@mui/material';
import { Plus, Truck, X } from 'lucide-react';
import api from '../api/client';
import { fmt, fmtDate } from '../utils/format';
import { StatusChip, EmptyRow } from '../components/ui';

export default function Purchases({ initialTab = 'orders' }: { initialTab?: string }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const [poDialog, setPoDialog] = useState(false);
  const [receiveDialog, setReceiveDialog] = useState<any>(null);
  const [supplierDialog, setSupplierDialog] = useState(false);
  const [snack, setSnack] = useState<{ msg: string; type: any } | null>(null);

  const [poForm, setPoForm] = useState({ supplierId: '', notes: '', items: [] as { productId: string; orderedQty: string; unitCost: string }[] });
  const [receiveForm, setReceiveForm] = useState<Record<string, { qty: string; batch: string; expiry: string }>>({});
  const [supplierForm, setSupplierForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '' });

  const { data: orders = [] } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => (await api.get('/purchases/orders')).data,
  });
  const { data: receipts = [] } = useQuery({
    queryKey: ['goods-receipts'],
    queryFn: async () => (await api.get('/purchases/receipts')).data,
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get('/purchases/suppliers')).data,
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/products')).data,
  });

  const openReceive = (order: any) => {
    const initial: Record<string, { qty: string; batch: string; expiry: string }> = {};
    for (const item of order.items) {
      const outstanding = Math.max(0, Number(item.orderedQty) - Number(item.receivedQty));
      initial[item.productId] = { qty: String(outstanding), batch: '', expiry: '' };
    }
    setReceiveForm(initial);
    setReceiveDialog(order);
  };

  const savePO = useMutation({
    mutationFn: async () => {
      const items = poForm.items.filter((i) => i.productId && Number(i.orderedQty) > 0);
      return (await api.post('/purchases/orders', { supplierId: poForm.supplierId, notes: poForm.notes, items })).data;
    },
    onSuccess: () => { setPoDialog(false); setPoForm({ supplierId: '', notes: '', items: [] }); setSnack({ msg: 'Purchase order created', type: 'success' }); queryClient.invalidateQueries(); },
    onError: (e: any) => setSnack({ msg: e.response?.data?.error ?? 'Failed', type: 'error' }),
  });

  const confirmReceive = useMutation({
    mutationFn: async () => {
      const order = receiveDialog;
      const items = order.items
        .filter((i: any) => Number(receiveForm[i.productId]?.qty || 0) > 0)
        .map((i: any) => ({
          productId: i.productId,
          receivedQty: Number(receiveForm[i.productId].qty),
          unitCost: Number(i.unitCost),
          batchNumber: receiveForm[i.productId].batch || undefined,
          expiryDate: receiveForm[i.productId].expiry || undefined,
        }));
      return (await api.post('/purchases/receive', { purchaseOrderId: order.id, items })).data;
    },
    onSuccess: () => { setReceiveDialog(null); setSnack({ msg: 'Goods received — inventory updated', type: 'success' }); queryClient.invalidateQueries(); },
    onError: (e: any) => setSnack({ msg: e.response?.data?.error ?? 'Failed', type: 'error' }),
  });

  const saveSupplier = useMutation({
    mutationFn: async () => (await api.post('/purchases/suppliers', supplierForm)).data,
    onSuccess: () => { setSupplierDialog(false); setSupplierForm({ name: '', contactPerson: '', phone: '', email: '', address: '' }); setSnack({ msg: 'Supplier added', type: 'success' }); queryClient.invalidateQueries(); },
    onError: (e: any) => setSnack({ msg: e.response?.data?.error ?? 'Failed', type: 'error' }),
  });

  const poTotal = useMemo(() =>
    poForm.items.reduce((acc, i) => acc + Number(i.orderedQty || 0) * Number(i.unitCost || 0), 0), [poForm.items]);

  return (
    <Box>
      <Paper sx={{ borderRadius: 2.5, px: 1, mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
          <Tab label="Purchase Orders" />
          <Tab label="Goods Received" />
          <Tab label="Suppliers" />
        </Tabs>
      </Paper>

      {/* Purchase Orders */}
      {tab === 0 && (
        <Paper sx={{ borderRadius: 2.5, p: { xs: 1.5, sm: 2.5 } }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', gap: 1.5, mb: 2 }}>
            <TextField size="small" placeholder="Search purchase orders..." fullWidth sx={{ maxWidth: { sm: 280 } }} />
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setPoDialog(true)} sx={{ whiteSpace: 'nowrap', alignSelf: { xs: 'stretch', sm: 'auto' } }}>New Purchase Order</Button>
          </Box>
          <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <Table size="small" sx={{ minWidth: 560 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 11.5 }}>PO Number</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Date</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Supplier</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Items</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Total</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Status</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((o: any) => (
                  <TableRow key={o.id} hover>
                    <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{o.poNumber}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmtDate(o.createdAt)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{o.supplier?.name}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{o.items.length}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmt(o.totalAmount)}</TableCell>
                    <TableCell><StatusChip status={o.status} /></TableCell>
                    <TableCell align="right">
                      {o.status !== 'RECEIVED' && (
                        <Button size="small" variant="outlined" startIcon={<Truck size={13} />} onClick={() => openReceive(o)}>
                          Receive
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && <EmptyRow colSpan={7} message="No purchase orders yet" />}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* Goods received */}
      {tab === 1 && (
        <Paper sx={{ borderRadius: 2.5, p: { xs: 1.5, sm: 2.5 } }}>
          <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <Table size="small" sx={{ minWidth: 560 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 11.5 }}>GRN</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Date</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>PO Ref</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Supplier</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Items Received</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }}>Recorded By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {receipts.map((r: any) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{r.receiptNumber}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmtDate(r.createdAt)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{r.purchaseOrder?.poNumber}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{r.supplier?.name}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{r.items.map((i: any) => `${i.product?.name} ×${Number(i.receivedQty)}`).join(', ')}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{r.user?.fullName}</TableCell>
                  </TableRow>
                ))}
                {receipts.length === 0 && <EmptyRow colSpan={6} message="No goods received yet" />}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* Suppliers */}
      {tab === 2 && (
        <Paper sx={{ borderRadius: 2.5, p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, mb: 2 }}>
            <Typography sx={{ fontWeight: 700 }}>Supplier Management</Typography>
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setSupplierDialog(true)}>Add Supplier</Button>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
            {suppliers.map((s: any) => (
              <Box key={s.id} sx={{ border: '1px solid #E3EBF3', borderRadius: 2, p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontWeight: 700 }}>{s.name}</Typography>
                  <Chip size="small" label={`${s._count?.purchaseOrders ?? 0} POs`} sx={{ bgcolor: '#EAF3FB' }} />
                </Box>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                  {s.contactPerson ?? '—'} · {s.phone ?? '—'}
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{s.email ?? '—'}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{s.address ?? '—'}</Typography>
                <Typography sx={{ fontSize: 11, color: '#8AA3B8', mt: 1 }}>{s._count?.products ?? 0} products supplied</Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* New PO dialog */}
      <Dialog open={poDialog} onClose={() => setPoDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Purchase Order</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField select size="small" label="Supplier" value={poForm.supplierId} onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}>
              <MenuItem value="direct-cash"><em>⚡ Direct Cash / Open Market (No Supplier)</em></MenuItem>
              {suppliers.map((s: any) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Notes" value={poForm.notes} onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: 13, mt: 2, mb: 1 }}>Items</Typography>
          {poForm.items.map((it, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField select size="small" label="Product" value={it.productId} onChange={(e) => {
                const p = products.find((x: any) => x.id === e.target.value);
                const items = [...poForm.items];
                items[idx] = { ...items[idx], productId: e.target.value, unitCost: p ? String(p.purchasePrice) : items[idx].unitCost };
                setPoForm({ ...poForm, items });
              }} sx={{ flex: 2 }}>
                {products.map((p: any) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </TextField>
              <TextField size="small" type="number" label="Qty" value={it.orderedQty}
                onChange={(e) => { const items = [...poForm.items]; items[idx] = { ...items[idx], orderedQty: e.target.value }; setPoForm({ ...poForm, items }); }} sx={{ flex: 1 }} />
              <TextField size="small" type="number" label="Unit Cost" value={it.unitCost}
                onChange={(e) => { const items = [...poForm.items]; items[idx] = { ...items[idx], unitCost: e.target.value }; setPoForm({ ...poForm, items }); }} sx={{ flex: 1 }} />
              <IconButton onClick={() => setPoForm({ ...poForm, items: poForm.items.filter((_, i) => i !== idx) })}><X size={15} /></IconButton>
            </Box>
          ))}
          <Button size="small" startIcon={<Plus size={13} />} onClick={() => setPoForm({ ...poForm, items: [...poForm.items, { productId: '', orderedQty: '', unitCost: '' }] })}>
            Add item
          </Button>
          <Typography sx={{ textAlign: 'right', fontWeight: 800, mt: 1 }}>PO Total: {fmt(poTotal)}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPoDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => savePO.mutate()} disabled={poForm.items.length === 0 || savePO.isPending}>Create Order</Button>
        </DialogActions>
      </Dialog>

      {/* Receive goods dialog */}
      <Dialog open={!!receiveDialog} onClose={() => setReceiveDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Receive Goods — {receiveDialog?.poNumber}</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>
            Enter actual quantities delivered. Inventory is updated only when you confirm.
          </Typography>
          {receiveDialog?.items.map((i: any) => (
            <Box key={i.id} sx={{ mb: 2, p: 1.5, border: '1px solid #E3EBF3', borderRadius: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{i.product?.name}</Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 1 }}>
                Ordered {Number(i.orderedQty)} · Already received {Number(i.receivedQty)}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                <TextField size="small" type="number" label="Receive Qty" value={receiveForm[i.productId]?.qty ?? '0'}
                  onChange={(e) => setReceiveForm({ ...receiveForm, [i.productId]: { ...receiveForm[i.productId], qty: e.target.value } })} />
                <TextField size="small" label="Batch No." value={receiveForm[i.productId]?.batch ?? ''}
                  onChange={(e) => setReceiveForm({ ...receiveForm, [i.productId]: { ...receiveForm[i.productId], batch: e.target.value } })} />
                <TextField size="small" type="date" label="Expiry" InputLabelProps={{ shrink: true }} value={receiveForm[i.productId]?.expiry ?? ''}
                  onChange={(e) => setReceiveForm({ ...receiveForm, [i.productId]: { ...receiveForm[i.productId], expiry: e.target.value } })} />
              </Box>
            </Box> 
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiveDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => confirmReceive.mutate()} disabled={confirmReceive.isPending}>Confirm Receipt</Button>
        </DialogActions>
      </Dialog>

      {/* Add supplier */}
      <Dialog open={supplierDialog} onClose={() => setSupplierDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Supplier</DialogTitle>
        <DialogContent sx={{ pt: '12px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField size="small" label="Supplier Name" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} />
          <TextField size="small" label="Contact Person" value={supplierForm.contactPerson} onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })} />
          <TextField size="small" label="Phone" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
          <TextField size="small" label="Email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} />
          <TextField size="small" label="Address" value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupplierDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => saveSupplier.mutate()} disabled={!supplierForm.name}>Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack(null)}>
        <Alert severity={snack?.type} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
