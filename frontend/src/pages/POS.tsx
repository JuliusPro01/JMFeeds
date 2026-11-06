import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Chip, Typography, TextField, MenuItem, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell, TableHead, TableRow, Snackbar, Alert,
} from '@mui/material';
import { Plus, Trash2, Search } from 'lucide-react';
import api from '../api/client';
import { fmt } from '../utils/format';
import { StatusChip } from '../components/ui';

type CartItem = { productId: string; name: string; unit: string; quantity: number; price: number; stock: number };

export default function POS() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'OTHER'>('CASH');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('walkin');
  const [payDialog, setPayDialog] = useState(false);
  const [successDialog, setSuccessDialog] = useState<any>(null);
  const [error, setError] = useState('');

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/products')).data,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await api.get('/customers')).data,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data,
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return products;
    return products.filter((p: any) =>
      p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) || (p.barcode ?? '').toLowerCase().includes(s)
    );
  }, [products, search]);

  const subTotal = cart.reduce((acc, i) => acc + i.quantity * i.price, 0);
  const grandTotal = Math.max(0, subTotal - Number(discount || 0));
  const received = Number(amountReceived || 0);
  const change = Math.max(0, received - grandTotal);

  const addToCart = (p: any) => {
    if (Number(p.stockQuantity) <= 0) { setError(`'${p.name}' is out of stock`); return; }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) {
        if (existing.quantity + 1 > Number(p.stockQuantity)) { setError(`Only ${p.stockQuantity} ${p.unit} of ${p.name} available`); return prev; }
        return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { productId: p.id, name: p.name, unit: p.unit, quantity: 1, price: Number(p.sellingPrice), stock: Number(p.stockQuantity) }];
    });
  };

  const updateQty = (productId: string, qty: number) =>
    setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(0.01, Math.min(i.stock, Number(qty))) } : i)));

  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((i) => i.productId !== productId));

  const checkout = useMutation({
    mutationFn: async () => {
      const cashTendered = Number(amountReceived || 0);
      const isCash = paymentMethod === 'CASH';
      const changeReturned = isCash && cashTendered > grandTotal ? cashTendered - grandTotal : 0;
      const refNote = isCash && cashTendered > grandTotal
        ? `Tendered: KSh ${cashTendered.toLocaleString()} | Change: KSh ${changeReturned.toLocaleString()}`
        : null;

      const payload = {
        customerId: customerId === 'walkin' ? undefined : customerId,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.price })),
        discount: Number(discount || 0),
        payments: [{
          amount: Math.min(cashTendered > 0 ? cashTendered : grandTotal, grandTotal),
          paymentMethod,
          reference: refNote,
        }],
      };
      const res = await api.post('/sales', payload);
      return {
        ...res.data,
        cashTendered: isCash && cashTendered > 0 ? cashTendered : (res.data.amountPaid || grandTotal),
        changeReturned,
        paymentMethodUsed: paymentMethod,
      };
    },
    onSuccess: (data) => {
      setSuccessDialog(data);
      setPayDialog(false);
      setCart([]); setDiscount(0); setAmountReceived(''); setCustomerId('walkin');
      queryClient.invalidateQueries();
    },
    onError: (err: any) => setError(err.response?.data?.error ?? 'Checkout failed'),
  });

  const confirmCheckout = () => {
    if (received < grandTotal && customerId === 'walkin') {
      setError('Credit sales require a registered customer. Select a customer or collect full payment.');
      return;
    }
    checkout.mutate();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2.5 }}>
      {/* Left: products */}
      <Box flex={1.35}>
        <Paper sx={{ borderRadius: 2.5, p: 2.5, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ fontWeight: 700 }}>Select Customer</Typography>
            <Chip label="✓ Walk-in Customer" sx={{ bgcolor: '#EAF7EF', color: '#1B7A3E', fontWeight: 700, fontSize: 12 }} />
          </Box>
          <TextField
            select size="small" fullWidth value={customerId} onChange={(e) => setCustomerId(e.target.value)} sx={{ mb: 2 }}
          >
            <MenuItem value="walkin">Walk-in Customer</MenuItem>
            {customers.filter((c: any) => c.isActive).map((c: any) => (
              <MenuItem key={c.id} value={c.id}>{c.name} — {c.customerType}{Number(c.outstandingDebt) > 0 ? ` (owes ${fmt(c.outstandingDebt)})` : ''}</MenuItem>
            ))}
          </TextField>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#F5F9FC', border: '1px solid #E3EBF3', borderRadius: 2, px: 1.5, py: 0.7, mb: 2 }}>
            <Search size={15} color="#8AA3B8" />
            <input
              placeholder="Search product by name, SKU, or scan barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filtered.length === 1) addToCart(filtered[0]);
              }}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13, background: 'transparent' }}
              autoFocus
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 1.5, maxHeight: 380, overflow: 'auto', pr: 0.5 }}>
            {filtered.map((p: any) => {
              const status = Number(p.stockQuantity) <= 0 ? 'Out of Stock' : Number(p.stockQuantity) <= Number(p.minStockThreshold) ? 'Low Stock' : 'In Stock';
              return (
                <Box key={p.id} onClick={() => addToCart(p)}
                  sx={{ border: '1px solid #E3EBF3', borderRadius: 2, p: 1.5, cursor: 'pointer', bgcolor: '#fff', '&:hover': { borderColor: '#23A455', shadow: 1 }, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{p.name}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{p.category?.name} · {p.unit}</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#123A52' }}>{fmt(p.sellingPrice)}</Typography>
                    <StatusChip status={status} />
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Paper>
      </Box>

      {/* Right: cart */}
      <Box flex={1} sx={{ minWidth: 320 }}>
        <Paper sx={{ borderRadius: 2.5, p: 2.5 }}>
          <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Cart Summary</Typography>
          {cart.length === 0 ? (
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', py: 2, textAlign: 'center' }}>
              Click a product to add it to the cart
            </Typography>
          ) : (
            <Table size="small" sx={{ mb: 1 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: 11.5 }}>Product</TableCell>
                  <TableCell sx={{ fontSize: 11.5, width: 78 }}>Qty</TableCell>
                  <TableCell sx={{ fontSize: 11.5 }} align="right">Total</TableCell>
                  <TableCell sx={{ width: 28 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {cart.map((i) => (
                  <TableRow key={i.productId}>
                    <TableCell sx={{ fontSize: 12 }}>
                      {i.name}
                      <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>{fmt(i.price)} / {i.unit}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Button size="small" sx={{ minWidth: 20, height: 24, p: 0, fontSize: 13 }} onClick={() => updateQty(i.productId, Math.max(0.1, Number((i.quantity - 1).toFixed(2))))}>−</Button>
                        <TextField
                          size="small"
                          type="number"
                          value={i.quantity}
                          onChange={(e) => updateQty(i.productId, Number(e.target.value))}
                          inputProps={{ min: 0.01, step: 'any', style: { textAlign: 'center', padding: '3px 4px', fontSize: 12, width: 46 } }}
                          sx={{ width: 56 }}
                        />
                        <Button size="small" sx={{ minWidth: 20, height: 24, p: 0, fontSize: 13 }} onClick={() => updateQty(i.productId, Math.min(i.stock, Number((i.quantity + 1).toFixed(2))))}>+</Button>
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700 }}>{fmt(i.quantity * i.price)}</TableCell>
                    <TableCell>
                      <Trash2 size={14} color="#E23B3B" style={{ cursor: 'pointer' }} onClick={() => removeFromCart(i.productId)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Box sx={{ borderTop: '2px dashed #E3EBF3', pt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.8, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Subtotal</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{fmt(subTotal)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Discount</Typography>
              <TextField size="small" type="number" value={discount || ''} placeholder="0"
                onChange={(e) => setDiscount(Number(e.target.value))}
                sx={{ width: 110, '& input': { py: 0.4, fontSize: 13, textAlign: 'right' } }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 800 }}>Total</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#123A52' }}>{fmt(grandTotal)}</Typography>
            </Box>
          </Box>

          <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 1 }}>Payment Method</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            {(['CASH', 'BANK', 'OTHER'] as const).map((m) => (
              <Chip key={m} label={m.charAt(0) + m.slice(1).toLowerCase()} clickable
                onClick={() => setPaymentMethod(m)}
                sx={{ fontWeight: 700, fontSize: 12, px: 1,
                  ...(paymentMethod === m ? { bgcolor: '#23A455', color: '#fff' } : { border: '1px solid #E3EBF3' }) }} />
            ))}
          </Box>
          <TextField size="small" fullWidth type="number" placeholder="Amount Received" value={amountReceived}
            onChange={(e) => setAmountReceived(e.target.value)} sx={{ mb: 1, '& input': { fontWeight: 700 } }} />
          {received > 0 && (
            <Typography sx={{ fontSize: 13, mb: 1.5 }}>
              Change: <b style={{ color: 'green' }}>{fmt(change)}</b>
              {grandTotal - received > 0 && <span style={{ color: '#E23B3B', marginLeft: 8 }}>Outstanding: {fmt(grandTotal - received)}</span>}
            </Typography>
          )}

          <Button fullWidth variant="contained" size="large" sx={{ py: 1.4 }} disabled={cart.length === 0 || checkout.isPending}
            onClick={() => { setError(''); setPayDialog(true); }}>
            Complete Sale
          </Button>
        </Paper>
      </Box>

      {/* Confirm */}
      <Dialog open={payDialog} onClose={() => setPayDialog(false)}>
        <DialogTitle>Confirm Sale</DialogTitle>
        <DialogContent>
          <Typography>Total: <b>{fmt(grandTotal)}</b></Typography>
          <Typography>Receiving: <b>{fmt(Math.min(received, grandTotal) || grandTotal)} via {paymentMethod}</b></Typography>
          {(grandTotal - received > 0) && (
            <Alert severity="warning" sx={{ mt: 1, fontSize: 13 }}>
              Outstanding {fmt(grandTotal - received)} will be recorded as customer credit.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayDialog(false)}>Back</Button>
          <Button variant="contained" onClick={confirmCheckout} disabled={checkout.isPending}>
            {checkout.isPending ? 'Processing…' : 'Complete Sale'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receipt */}
      <Dialog open={!!successDialog} onClose={() => setSuccessDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: 'success.main', fontWeight: 800 }}>✓ Sale Completed — {successDialog?.invoiceNumber}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#123A52' }}>
            {settings?.businessName || 'Voice of the Farmer JM FEEDS'}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 1.5 }}>
            {settings?.physicalAddress || "Murang'a Town"} · Tel: {settings?.contactPhone || '0726704623'}
          </Typography>
          {(successDialog?.items ?? []).map((i: any) => (
            <Box key={i.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.4, fontSize: 13 }}>
              <span>{i.product?.name} × {Number(i.quantity)}</span>
              <b>{fmt(i.totalPrice)}</b>
            </Box>
          ))}
          <Box sx={{ borderTop: '1px solid #E3EBF3', mt: 1.5, pt: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, mb: 0.5 }}>
              <span>Total Bill</span><b>{fmt(successDialog?.totalAmount)}</b>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, mb: 0.5, color: '#1B7A3E' }}>
              <span>Amount Paid ({successDialog?.paymentMethodUsed || 'CASH'})</span>
              <b>{fmt(successDialog?.cashTendered ?? successDialog?.amountPaid)}</b>
            </Box>
            {Number(successDialog?.changeReturned) > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, mb: 0.5, bgcolor: '#EAF7EF', p: 0.8, borderRadius: 1.5 }}>
                <span style={{ fontWeight: 700, color: '#1B7A3E' }}>Change Returned</span>
                <b style={{ color: '#1B7A3E', fontSize: 14 }}>{fmt(successDialog.changeReturned)}</b>
              </Box>
            )}
            {Number(successDialog?.balanceDue) > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#C02828' }}>
                <span>Credit Balance Due</span><b>{fmt(successDialog.balanceDue)}</b>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => window.print()}>Print Receipt</Button>
          <Button onClick={() => setSuccessDialog(null)}>New Sale</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError('')}>
        <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
      </Snackbar>
    </Box>
  );
}
