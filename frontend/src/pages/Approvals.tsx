import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert, Chip,
} from '@mui/material';
import api from '../api/client';
import { fmt, fmtDateTime } from '../utils/format';
import { EmptyRow } from '../components/ui';

export default function Approvals() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [reviewing, setReviewing] = useState<any>(null);
  const [action, setAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [notes, setNotes] = useState('');
  const [snack, setSnack] = useState<{ msg: string; type: any } | null>(null);

  const isOwner = (JSON.parse(localStorage.getItem('feedpro_user') ?? '{}')?.role ?? 'OPERATOR') !== 'OPERATOR';

  const { data, isLoading } = useQuery({
    queryKey: ['approvals'],
    queryFn: async () => (await api.get('/approvals')).data,
  });

  const review = useMutation({
    mutationFn: async () =>
      (await api.post(`/approvals/${reviewing.id}/review`, { action, ownerNotes: notes })).data,
    onSuccess: (res) => {
      setReviewing(null); setNotes('');
      queryClient.invalidateQueries();
      setSnack({ msg: typeof res.message === 'string' ? res.message : 'Review submitted', type: action === 'APPROVE' ? 'success' : 'warning' });
    },
    onError: (e: any) => setSnack({ msg: e.response?.data?.error ?? 'Failed', type: 'error' }),
  });

  const openReview = (request: any, a: 'APPROVE' | 'REJECT') => { setReviewing(request); setAction(a); setNotes(''); };

  const counts = data?.counts;

  return (
    <Box>
      {/* Tabs */}
      <Paper sx={{ borderRadius: 2.5, px: 1, mb: 2 }}>
        <Box sx={{ display: 'flex', overflowX: 'auto' }}>
          {([['PENDING', 'Pending'], ['APPROVED', 'Approved'], ['REJECTED', 'Rejected']] as const).map(([key, label]) => (
            <Button key={key} onClick={() => setTab(key)}
              sx={{ px: 2.5, py: 1.4, borderRadius: 0, borderBottom: tab === key ? '2px solid #23A455' : '2px solid transparent', color: tab === key ? '#23A455' : '#6B7C93', fontWeight: 700, fontSize: 13 }}>
              {label} {counts ? `(${key === 'PENDING' ? counts.pending : key === 'APPROVED' ? counts.approved : counts.rejected})` : ''}
            </Button>
          ))}
        </Box>
      </Paper>

      <Paper sx={{ borderRadius: 2.5, p: { xs: 1.5, sm: 2.5 } }}>
        <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <Table size="small" sx={{ minWidth: 620 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: 11.5 }}>Type</TableCell>
              <TableCell sx={{ fontSize: 11.5 }}>Transaction</TableCell>
              <TableCell sx={{ fontSize: 11.5 }}>Reason</TableCell>
              <TableCell sx={{ fontSize: 11.5 }}>Requested By</TableCell>
              <TableCell sx={{ fontSize: 11.5 }}>Date</TableCell>
              <TableCell sx={{ fontSize: 11.5 }}>Status</TableCell>
              <TableCell sx={{ fontSize: 11.5 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data?.requests ?? [])
              .filter((r: any) => r.status === tab)
              .map((r: any) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Chip size="small" label={r.transactionType} sx={{ bgcolor: '#E9F3FC', fontWeight: 700, fontSize: 10.5 }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>
                    {r.sale?.invoiceNumber ?? r.transactionId}
                    {r.sale && (
                      <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                        Total {fmt(r.sale.totalAmount)} · Paid {fmt(r.sale.amountPaid)} · Balance {fmt(r.sale.balanceDue)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, maxWidth: 220 }}>{r.reason}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{r.user?.fullName}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{fmtDateTime(r.createdAt)}</TableCell>
                  <TableCell>
                    <Chip size="small" label={r.status} sx={{
                      bgcolor: r.status === 'PENDING' ? '#FFF6E9' : r.status === 'APPROVED' ? '#EAF7EF' : '#FDECEC',
                      color: r.status === 'PENDING' ? '#B26A00' : r.status === 'APPROVED' ? '#1B7A3E' : '#C02828',
                      fontWeight: 700, fontSize: 10.5,
                    }} />
                  </TableCell>
                  <TableCell align="right">
                    {isOwner && r.status === 'PENDING' && (
                      <Box sx={{ display: 'flex', gap: 0.6, justifyContent: 'flex-end' }}>
                        <Button size="small" variant="contained" color="success" onClick={() => openReview(r, 'APPROVE')}>Approve</Button>
                        <Button size="small" variant="outlined" color="error" onClick={() => openReview(r, 'REJECT')}>Reject</Button>
                      </Box>
                    )}
                    {r.ownerNotes && <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>Note: {r.ownerNotes}</Typography>}
                  </TableCell>
                </TableRow>
              ))}
            {(data?.requests ?? []).filter((r: any) => r.status === tab).length === 0 && (
              <EmptyRow colSpan={7} message={`No ${tab.toLowerCase()} requests`} />
            )}
          </TableBody>
        </Table>
        </Box>
      </Paper>

      {/* Review dialog */}
      <Dialog open={!!reviewing} onClose={() => setReviewing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{action === 'APPROVE' ? 'Approve & Reverse Transaction' : 'Reject Cancellation Request'}</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <Box sx={{ bgcolor: '#F5F9FC', borderRadius: 2, p: 2, mb: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
              {reviewing?.sale?.invoiceNumber ?? reviewing?.transactionId} ({reviewing?.transactionType})
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              Reason: {reviewing?.reason}
            </Typography>
            {reviewing?.sale && (
              <Box sx={{ mt: 1, fontSize: 12 }}>
                {(reviewing.sale.items ?? []).map((i: any) => (
                  <Box key={i.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{i.product?.name} × {Number(i.quantity)}</span>
                    <span>{fmt(i.totalPrice)}</span>
                  </Box>
                ))}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, mt: 0.5 }}>
                  <span>Total</span><span>{fmt(reviewing.sale.totalAmount)}</span>
                </Box>
              </Box>
            )}
          </Box>
          {action === 'APPROVE' && (
            <Alert severity="warning" sx={{ mb: 2, fontSize: 12.5 }}>
              Approving will record an auditable reversal: the original transaction is preserved and marked REVERSED,
              stock is restored, and any customer credit is adjusted  exactly once, in a single database transaction.
            </Alert>
          )}
          <TextField label="Owner comments / decision notes" size="small" multiline rows={2} fullWidth
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewing(null)}>Cancel</Button>
          <Button variant="contained" color={action === 'APPROVE' ? 'success' : 'error'}
            onClick={() => review.mutate()} disabled={review.isPending}>
            {review.isPending ? 'Processing…' : action === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)}>
        <Alert severity={snack?.type} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
