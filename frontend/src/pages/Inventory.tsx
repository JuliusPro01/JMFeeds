import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Chip, Typography, TextField, MenuItem, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, Table, TableBody, TableCell, TableHead, TableRow, Snackbar, Alert, IconButton, Tooltip,
  InputAdornment, Divider, Stack
} from '@mui/material';
import { Edit, Plus, History, PackageX, Sparkles, AlertCircle, Package, Trash2, Archive, RotateCcw } from 'lucide-react';
import api from '../api/client';
import { fmt, fmtDate } from '../utils/format';
import { StatusChip, PageLoading } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';

const emptyForm = {
  sku: '', barcode: '', name: '', description: '', categoryId: '', brand: '', unit: 'Bag',
  purchasePrice: '', sellingPrice: '', stockQuantity: '', minStockThreshold: 5,
  supplierId: '', batchNumber: '', expiryDate: '',
};

export default function Inventory() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isOwner = currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteProductDialog, setDeleteProductDialog] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [historyProduct, setHistoryProduct] = useState<any>(null);
  const [snack, setSnack] = useState<{ msg: string; type: any } | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', activeTab],
    queryFn: async () => (await api.get(`/products?status=${activeTab}`)).data,
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/products/${id}`)).data,
    onSuccess: (res: any) => {
      setDeleteProductDialog(null);
      setSnack({ msg: res.message, type: res.action === 'DELETED' ? 'info' : 'warning' });
      queryClient.invalidateQueries();
    },
    onError: (e: any) => setSnack({ msg: e.response?.data?.error ?? 'Failed to delete product', type: 'error' }),
  });

  const restoreProduct = useMutation({
    mutationFn: async (id: string) => (await api.put(`/products/${id}`, { isActive: true })).data,
    onSuccess: (res: any) => {
      setSnack({ msg: `Product "${res.name}" restored to active inventory`, type: 'success' });
      queryClient.invalidateQueries();
    },
    onError: (e: any) => setSnack({ msg: e.response?.data?.error ?? 'Failed to restore product', type: 'error' }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/products/categories')).data,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get('/purchases/suppliers')).data,
  });

  const stockStatus = (p: any): string => {
    const stock = Number(p.stockQuantity);
    if (p.expiryDate && new Date(p.expiryDate) < new Date()) return 'Expired';
    if (p.expiryDate && (new Date(p.expiryDate).getTime() - Date.now()) / 86400000 <= 30) return 'Expiring Soon';
    if (stock <= 0) return 'Out of Stock';
    if (stock <= Number(p.minStockThreshold)) return 'Low Stock';
    return 'In Stock';
  };

  const filtered = useMemo(() => products.filter((p: any) => {
    const s = search.toLowerCase().trim();
    const matchS = !s || p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) || (p.barcode ?? '').includes(s);
    const matchC = catFilter === 'ALL' || p.category?.name === catFilter;
    const matchSt = statusFilter === 'ALL' || stockStatus(p) === statusFilter;
    return matchS && matchC && matchSt;
  }), [products, search, catFilter, statusFilter]);

  const openAdd = () => {
    setEditing(null);
    const defaultCatId = categories.length > 0 ? categories[0].id : '';
    const defaultCat = categories.find((c: any) => c.id === defaultCatId);
    const prefix = defaultCat?.name?.toLowerCase().includes('cosm') ? 'COSM' : 'FEED';
    const rand = Math.floor(1000 + Math.random() * 9000);
    setForm({
      ...emptyForm,
      categoryId: defaultCatId,
      sku: `${prefix}-${rand}`,
    });
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      ...emptyForm,
      sku: p.sku,
      barcode: p.barcode ?? '',
      name: p.name,
      description: p.description ?? '',
      categoryId: p.categoryId,
      brand: p.brand ?? '',
      unit: p.unit ?? 'Bag',
      purchasePrice: String(p.purchasePrice),
      sellingPrice: String(p.sellingPrice),
      stockQuantity: String(p.stockQuantity ?? 0),
      minStockThreshold: p.minStockThreshold ?? 5,
      supplierId: p.supplierId ?? '',
      batchNumber: p.batchNumber ?? '',
      expiryDate: p.expiryDate ? p.expiryDate.slice(0, 10) : '',
    });
    setDialogOpen(true);
  };

  const autoGenerateSku = () => {
    const cat = categories.find((c: any) => c.id === form.categoryId);
    const prefix = cat?.name?.toLowerCase().includes('cosm') ? 'COSM' : 'FEED';
    const rand = Math.floor(1000 + Math.random() * 9000);
    setForm((prev: any) => ({ ...prev, sku: `${prefix}-${rand}` }));
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ...form,
        purchasePrice: Number(form.purchasePrice),
        sellingPrice: Number(form.sellingPrice),
        stockQuantity: Number(form.stockQuantity || 0),
        minStockThreshold: Number(form.minStockThreshold || 5),
      };
      if (editing) {
        return (await api.put(`/products/${editing.id}`, payload)).data;
      }
      return (await api.post('/products', payload)).data;
    },
    onSuccess: () => {
      setDialogOpen(false);
      setSnack({ msg: editing ? 'Product updated successfully' : 'Product added with opening stock', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: any) => setSnack({ msg: e.response?.data?.error ?? 'Save failed', type: 'error' }),
  });

  // Calculate live profit margin in dialog
  const costNum = Number(form.purchasePrice) || 0;
  const sellNum = Number(form.sellingPrice) || 0;
  const marginAmt = sellNum - costNum;
  const marginPct = sellNum > 0 ? ((marginAmt / sellNum) * 100).toFixed(1) : '0';

  if (isLoading) return <PageLoading />;

  return (
    <Box>
      {/* 1. Header Toolbar with Prominent Add Button */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#123A52', letterSpacing: -0.3 }}>
            Inventory & Product Catalog
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#627D98', mt: 0.3 }}>
            {isOwner
              ? 'Add new feeds and cosmetics, set buying & selling prices, manage stock quantities and units'
              : 'View current stock levels, units, and availability for sales'}
          </Typography>
        </Box>

        {isOwner && (
          <Button
            variant="contained"
            size="large"
            startIcon={<Plus size={18} />}
            onClick={openAdd}
            sx={{
              bgcolor: '#23A455',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              px: 3,
              py: 1.1,
              borderRadius: 2,
              boxShadow: '0 4px 14px rgba(35, 164, 85, 0.3)',
              textTransform: 'none',
              '&:hover': {
                bgcolor: '#1E8D49',
                boxShadow: '0 6px 18px rgba(35, 164, 85, 0.4)',
              },
            }}
          >
            + Add New Product
          </Button>
        )}
      </Box>

      {/* 2. Main Paper Table Container */}
      <Paper sx={{ borderRadius: 2.5, p: 2.5, border: '1px solid #E3EBF3' }} elevation={0}>
        {/* Active vs Archived Selector for Owner */}
        {isOwner && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              size="small"
              variant={activeTab === 'ACTIVE' ? 'contained' : 'outlined'}
              onClick={() => setActiveTab('ACTIVE')}
              sx={{
                fontWeight: 700,
                borderRadius: 2,
                textTransform: 'none',
                bgcolor: activeTab === 'ACTIVE' ? '#23A455' : 'transparent',
                '&:hover': { bgcolor: activeTab === 'ACTIVE' ? '#1E8D49' : '#EAF7EF' },
              }}
            >
              Active Products
            </Button>
            <Button
              size="small"
              variant={activeTab === 'ARCHIVED' ? 'contained' : 'outlined'}
              color="inherit"
              onClick={() => setActiveTab('ARCHIVED')}
              startIcon={<Archive size={14} />}
              sx={{
                fontWeight: 700,
                borderRadius: 2,
                textTransform: 'none',
                color: activeTab === 'ARCHIVED' ? '#fff' : '#627D98',
                bgcolor: activeTab === 'ARCHIVED' ? '#47607A' : 'transparent',
                '&:hover': { bgcolor: activeTab === 'ARCHIVED' ? '#334E68' : '#F0F4F8' },
              }}
            >
              Archived Products
            </Button>
          </Box>
        )}

        {/* Search & Filter Toolbar */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2.5, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search product name, SKU or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 220 }, flex: { sm: 1 } }}
          />
          <TextField
            size="small"
            select
            label="All Categories"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="ALL">All Categories</MenuItem>
            {categories.map((c: any) => (
              <MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            select
            label="All Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            {['ALL', 'In Stock', 'Low Stock', 'Out of Stock', 'Expiring Soon', 'Expired'].map((s) => (
              <MenuItem key={s} value={s}>{s === 'ALL' ? 'All Status' : s}</MenuItem>
            ))}
          </TextField>
          <Box sx={{ flexGrow: 1 }} />
          <Typography sx={{ fontSize: 13, color: '#627D98', fontWeight: 600 }}>
            Showing {filtered.length} of {products.length} products
          </Typography>
        </Box>

        {/* Product Table */}
        <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <Table size="small" sx={{ minWidth: 580 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
              <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Type</TableCell>
              <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Product Name & SKU</TableCell>
              <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Category</TableCell>
              <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Stock Qty</TableCell>
              <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Unit</TableCell>
              {isOwner && <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Cost (Buy)</TableCell>}
              <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Price (Sell)</TableCell>
              <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((p: any) => (
              <TableRow key={p.id} hover>
                <TableCell>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1.5,
                      bgcolor: p.category?.name === 'Cosmetics' ? '#F4F0FB' : '#EAF7EF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography sx={{ fontSize: 14 }}>
                      {p.category?.name === 'Cosmetics' ? 'ðŸ§´' : 'ðŸŒ¾'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#123A52' }}>
                    {p.name}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#627D98' }}>
                    SKU: {p.sku} {p.barcode ? `â€¢ Barcode: ${p.barcode}` : ''}
                  </Typography>
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  <Chip
                    label={p.category?.name || 'Unassigned'}
                    size="small"
                    sx={{
                      bgcolor: p.category?.name === 'Cosmetics' ? '#F4F0FB' : '#EAF7EF',
                      color: p.category?.name === 'Cosmetics' ? '#6B46C1' : '#1B7A3E',
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  />
                </TableCell>
                <TableCell sx={{ fontSize: 13, fontWeight: 800, color: Number(p.stockQuantity) <= Number(p.minStockThreshold) ? '#D32F2F' : '#123A52' }}>
                  {Number(p.stockQuantity).toLocaleString()}
                </TableCell>
                <TableCell sx={{ fontSize: 12, color: '#47607A' }}>
                  {p.unit}
                </TableCell>
                {isOwner && (
                  <TableCell sx={{ fontSize: 12, color: '#627D98' }}>
                    {fmt(p.purchasePrice)}
                  </TableCell>
                )}
                <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#1B7A3E' }}>
                  {fmt(p.sellingPrice)}
                </TableCell>
                <TableCell>
                  <StatusChip status={stockStatus(p)} />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                    <Tooltip title="View Stock Movement History">
                      <IconButton size="small" onClick={() => setHistoryProduct(p)}>
                        <History size={16} color="#627D98" />
                      </IconButton>
                    </Tooltip>

                    {isOwner && activeTab === 'ACTIVE' && (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Edit size={14} />}
                          onClick={() => openEdit(p)}
                          sx={{
                            fontSize: 12,
                            py: 0.3,
                            px: 1.2,
                            textTransform: 'none',
                            borderColor: '#CFDCE6',
                            color: '#123A52',
                            fontWeight: 600,
                            '&:hover': {
                              borderColor: '#23A455',
                              color: '#23A455',
                              bgcolor: '#EAF7EF',
                            },
                          }}
                        >
                          Edit
                        </Button>
                        <Tooltip title="Delete or Archive Product">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteProductDialog(p)}
                            sx={{
                              border: '1px solid #FCD4D4',
                              borderRadius: 1.5,
                              p: 0.6,
                              '&:hover': { bgcolor: '#FDE8E8' },
                            }}
                          >
                            <Trash2 size={15} />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}

                    {isOwner && activeTab === 'ARCHIVED' && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<RotateCcw size={14} />}
                        onClick={() => restoreProduct.mutate(p.id)}
                        disabled={restoreProduct.isPending}
                        sx={{ fontSize: 12, py: 0.3, px: 1.2, textTransform: 'none', fontWeight: 700 }}
                      >
                        Restore to Active
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}

            {/* Empty Table Friendly Call to Action */}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={isOwner ? 9 : 8} align="center" sx={{ py: 6 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                    <Package size={44} color="#8AA3B8" />
                    <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#123A52' }}>
                      {products.length === 0 ? 'No Products in Inventory Yet' : 'No Matching Products Found'}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: '#627D98', maxWidth: 420 }}>
                      {products.length === 0
                        ? isOwner
                          ? 'Your catalog is clean and ready. Click "+ Add New Product" to create your first animal feed or cosmetic item with its selling price and initial stock.'
                          : 'No products are currently in inventory. Please contact the store owner or manager to add stock.'
                        : 'Try adjusting your search query or status filter to find what you are looking for.'}
                    </Typography>
                    {products.length === 0 && isOwner && (
                      <Button
                        variant="contained"
                        startIcon={<Plus size={16} />}
                        onClick={openAdd}
                        sx={{
                          mt: 1,
                          bgcolor: '#23A455',
                          textTransform: 'none',
                          fontWeight: 700,
                          '&:hover': { bgcolor: '#1E8D49' },
                        }}
                      >
                        + Add First Product
                      </Button>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </Box>
      </Paper>

      {/* 3. Add / Edit Product Dialog (Matching Mockup Panel 6) */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 19, color: '#123A52', pb: 1 }}>
          {editing ? `Edit Product: ${editing.name}` : 'Add New Product to Inventory'}
        </DialogTitle>
        <Typography sx={{ fontSize: 13, color: '#627D98', px: 3, pb: 2 }}>
          Configure the product name, category, purchase cost, selling price, and opening inventory.
        </Typography>

        <DialogContent sx={{ pt: '8px !important' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
            {/* Left Column: Basic Details */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#23A455', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                1. Product Information
              </Typography>

              <TextField
                label="Product Name *"
                size="small"
                placeholder="e.g. Dairy Meal 50kg, Chicken Layer Mash"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                fullWidth
              />

              <TextField
                select
                label="Category *"
                size="small"
                value={form.categoryId}
                onChange={(e) => {
                  const newCatId = e.target.value;
                  const cat = categories.find((c: any) => c.id === newCatId);
                  const prefix = cat?.name?.toLowerCase().includes('cosm') ? 'COSM' : 'FEED';
                  const rand = Math.floor(1000 + Math.random() * 9000);
                  const defaultUnit = cat?.name?.toLowerCase().includes('cosm') ? 'Pcs' : 'Bag';
                  setForm((prev: any) => ({
                    ...prev,
                    categoryId: newCatId,
                    unit: prev.unit === 'Bag' && prefix === 'COSM' ? defaultUnit : prev.unit,
                    sku: !prev.sku || prev.sku.startsWith('FEED-') || prev.sku.startsWith('COSM-') || prev.sku.startsWith('PROD-')
                      ? `${prefix}-${rand}`
                      : prev.sku,
                  }));
                }}
                fullWidth
              >
                {categories.map((c: any) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </TextField>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="SKU / Product Code *"
                  size="small"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  fullWidth
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={autoGenerateSku}
                  sx={{ minWidth: 70, textTransform: 'none', fontSize: 11.5 }}
                >
                  Generate
                </Button>
              </Box>

              <TextField
                label="Barcode (Optional)"
                size="small"
                placeholder="Scan or enter barcode"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />

              <TextField
                label="Brand / Manufacturer"
                size="small"
                placeholder="e.g. Kenya Feeds, Unga Farm Care"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              />

              <TextField
                select
                label="Supplier (Optional)"
                size="small"
                value={form.supplierId}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
              >
                <MenuItem value="">â€” None / Local Sourcing â€”</MenuItem>
                {suppliers.map((s: any) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </TextField>
            </Box>

            {/* Right Column: Pricing, Units & Stock */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#23A455', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                2. Pricing & Stock
              </Typography>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Purchase Cost (KSh) *"
                  size="small"
                  type="number"
                  placeholder="3800"
                  value={form.purchasePrice}
                  onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                  InputProps={{ startAdornment: <InputAdornment position="start">KSh</InputAdornment> }}
                  fullWidth
                />
                <TextField
                  label="Selling Price (KSh) *"
                  size="small"
                  type="number"
                  placeholder="4300"
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                  InputProps={{ startAdornment: <InputAdornment position="start">KSh</InputAdornment> }}
                  fullWidth
                />
              </Box>

              {/* Live Profit Preview Box */}
              {sellNum > 0 && costNum > 0 && (
                <Box
                  sx={{
                    bgcolor: marginAmt >= 0 ? '#EAF7EF' : '#FDECEA',
                    border: `1px solid ${marginAmt >= 0 ? '#C2E7CE' : '#F5C6CB'}`,
                    borderRadius: 2,
                    p: 1.5,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography sx={{ fontSize: 12, color: marginAmt >= 0 ? '#1B7A3E' : '#C02828', fontWeight: 600 }}>
                    Profit Margin per {form.unit || 'Unit'}:
                  </Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: marginAmt >= 0 ? '#1B7A3E' : '#C02828' }}>
                    +KSh {marginAmt.toLocaleString()} ({marginPct}%)
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Unit (Bag / Kg / Pc) *"
                  size="small"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="Bag, Kg, Pc"
                  fullWidth
                />
                <TextField
                  label={editing ? "Stock Quantity" : "Opening Stock Quantity"}
                  size="small"
                  type="number"
                  placeholder="0"
                  value={form.stockQuantity}
                  onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                  fullWidth
                />
              </Box>

              <TextField
                label="Low Stock Alert Threshold"
                size="small"
                type="number"
                value={form.minStockThreshold}
                onChange={(e) => setForm({ ...form, minStockThreshold: e.target.value })}
                helperText="System alerts you when stock drops to or below this number"
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Batch Number"
                  size="small"
                  placeholder="e.g. B-2026/04"
                  value={form.batchNumber}
                  onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Expiry Date"
                  size="small"
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
            </Box>

            {/* Bottom: Description */}
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                label="Product Notes / Description"
                size="small"
                multiline
                rows={2}
                fullWidth
                placeholder="High quality dairy feed formulated for increased milk yield..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, borderTop: '1px solid #E8EFF5' }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#627D98', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => save.mutate()}
            disabled={save.isPending || !form.name || !form.sku || !form.categoryId || !form.purchasePrice || !form.sellingPrice}
            sx={{
              bgcolor: '#23A455',
              fontWeight: 700,
              textTransform: 'none',
              px: 3.5,
              py: 1,
              '&:hover': { bgcolor: '#1E8D49' },
            }}
          >
            {editing ? 'Update Product' : 'Save Product'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Smart Delete Confirmation Dialog */}
      <Dialog open={!!deleteProductDialog} onClose={() => setDeleteProductDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#C02828' }}>
          Delete / Archive Product
        </DialogTitle>
        <DialogContent sx={{ pt: '10px !important' }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, mb: 1 }}>
            Are you sure you want to remove "{deleteProductDialog?.name}"?
          </Typography>
          <Box sx={{ p: 1.5, bgcolor: '#F8FAFC', borderRadius: 2, mb: 2, border: '1px solid #E2E8F0' }}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              â€¢ SKU: <b>{deleteProductDialog?.sku}</b>
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              â€¢ Current Stock: <b>{deleteProductDialog?.stockQuantity} {deleteProductDialog?.unit}</b>
            </Typography>
          </Box>
          <Alert severity="info" sx={{ fontSize: 12 }}>
            <b>JMFeeds Smart Delete:</b> If this product has zero sales or purchase history, it will be permanently deleted. If it has past transactions, it will be safely archived (hidden from POS & active lists) to keep your financial reports intact.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setDeleteProductDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteProduct.isPending}
            onClick={() => deleteProduct.mutate(deleteProductDialog.id)}
          >
            {deleteProduct.isPending ? 'Processing...' : 'Confirm Delete / Archive'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 4. Movement History Dialog */}
      <Dialog open={!!historyProduct} onClose={() => setHistoryProduct(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Movement History â€” {historyProduct?.name}
          <IconButton onClick={() => setHistoryProduct(null)} sx={{ position: 'absolute', right: 10, top: 10 }}>
            <PackageX size={16} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <MovementHistory productId={historyProduct?.id} />
        </DialogContent>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack(null)}>
        <Alert severity={snack?.type} onClose={() => setSnack(null)}>
          {snack?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function MovementHistory({ productId }: { productId: string }) {
  const { data: ledger = [] } = useQuery({
    queryKey: ['inventory-ledger'],
    queryFn: async () => (await api.get('/inventory/ledger')).data,
  });
  const movements = ledger.filter((m: any) => m.productId === productId);
  if (movements.length === 0) {
    return (
      <Typography sx={{ fontSize: 13, color: 'text.secondary', py: 3, textAlign: 'center' }}>
        No stock movements recorded yet for this product.
      </Typography>
    );
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontSize: 11 }}>Date</TableCell>
          <TableCell sx={{ fontSize: 11 }}>Type</TableCell>
          <TableCell sx={{ fontSize: 11 }}>Change</TableCell>
          <TableCell sx={{ fontSize: 11 }}>Balance</TableCell>
          <TableCell sx={{ fontSize: 11 }}>Ref</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {movements.map((m: any) => (
          <TableRow key={m.id}>
            <TableCell sx={{ fontSize: 11.5 }}>{fmtDate(m.createdAt)}</TableCell>
            <TableCell sx={{ fontSize: 11.5 }}>{m.movementType.replace(/_/g, ' ')}</TableCell>
            <TableCell sx={{ fontSize: 11.5, fontWeight: 700, color: Number(m.quantityChange) > 0 ? '#1B7A3E' : '#C02828' }}>
              {Number(m.quantityChange) > 0 ? '+' : ''}{Number(m.quantityChange)}
            </TableCell>
            <TableCell sx={{ fontSize: 11.5 }}>{Number(m.balanceAfter)}</TableCell>
            <TableCell sx={{ fontSize: 10.5 }}>{m.referenceId ?? 'â€”'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
