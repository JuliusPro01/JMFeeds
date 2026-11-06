import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert, Switch, IconButton, MenuItem, Tooltip,
} from '@mui/material';
import { Plus, KeyRound, Trash2 } from 'lucide-react';
import api from '../api/client';
import { fmtDateTime } from '../utils/format';
import { useAuthStore } from '../store/useAuthStore';

export default function Users() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [addDialog, setAddDialog] = useState(false);
  const [deleteUserDialog, setDeleteUserDialog] = useState<any>(null);
  const [form, setForm] = useState({ username: '', password: '', fullName: '', role: 'OPERATOR' });
  const [resetDialog, setResetDialog] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [snack, setSnack] = useState<{ msg: string; type: any } | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });

  const save = useMutation({
    mutationFn: async () => (await api.post('/users', form)).data,
    onSuccess: () => {
      setAddDialog(false); setForm({ username: '', password: '', fullName: '', role: 'OPERATOR' });
      setSnack({ msg: 'Operator account created', type: 'success' }); queryClient.invalidateQueries();
    },
    onError: (e: any) => setSnack({ msg: e.response?.data?.error ?? 'Failed', type: 'error' }),
  });

  const toggleActive = useMutation({
    mutationFn: async (u: any) => (await api.put(`/users/${u.id}`, { isActive: !u.isActive })).data,
    onSuccess: () => { queryClient.invalidateQueries(); setSnack({ msg: 'Account status updated', type: 'success' }); },
    onError: (e: any) => setSnack({ msg: e.response?.data?.error ?? 'Failed', type: 'error' }),
  });

  const resetPassword = useMutation({
    mutationFn: async () => (await api.post(`/users/${resetDialog.id}/reset-password`, { newPassword })).data,
    onSuccess: () => { setResetDialog(null); setNewPassword(''); setSnack({ msg: 'Password reset', type: 'success' }); },
    onError: (e: any) => setSnack({ msg: e.response?.data?.error ?? 'Failed', type: 'error' }),
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/users/${id}`)).data,
    onSuccess: (res: any) => {
      setDeleteUserDialog(null);
      setSnack({ msg: res.message, type: res.action === 'DELETED' ? 'info' : 'warning' });
      queryClient.invalidateQueries();
    },
    onError: (e: any) => setSnack({ msg: e.response?.data?.error ?? 'Failed to delete user', type: 'error' }),
  });

  return (
    <Box>
      <Paper sx={{ borderRadius: 2.5, p: { xs: 1.5, sm: 2.5 } }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', mb: 2, gap: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>Users & Permissions</Typography>
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setAddDialog(true)} sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}>Add Operator</Button>
        </Box>
        <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <Table size="small" sx={{ minWidth: 500 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: 11.5 }}>Name</TableCell>
              <TableCell sx={{ fontSize: 11.5 }}>Username</TableCell>
              <TableCell sx={{ fontSize: 11.5 }}>Role</TableCell>
              <TableCell sx={{ fontSize: 11.5 }}>Status</TableCell>
              <TableCell sx={{ fontSize: 11.5 }}>Last Login</TableCell>
              <TableCell sx={{ fontSize: 11.5 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u: any) => (
              <TableRow key={u.id} hover>
                <TableCell sx={{ fontSize: 12.5, fontWeight: 700 }}>{u.fullName}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{u.username}</TableCell>
                <TableCell>
                  <Chip size="small" label={u.role === 'OWNER' ? 'Owner / Admin' : u.role} sx={{
                    bgcolor: u.role === 'OWNER' ? '#EAF7EF' : '#E9F3FB',
                    color: u.role === 'OWNER' ? '#1B7A3E' : '#1D6EA5', fontWeight: 700, fontSize: 10.5,
                  }} />
                </TableCell>
                <TableCell>
                  <Switch size="small" checked={u.isActive} disabled={u.role === 'OWNER'} onChange={() => toggleActive.mutate(u)} />
                </TableCell>
                <TableCell sx={{ fontSize: 11.5 }}>{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'Never'}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Reset password">
                    <IconButton size="small" onClick={() => setResetDialog(u)} sx={{ mr: 0.5 }}><KeyRound size={15} /></IconButton>
                  </Tooltip>
                  {u.role !== 'OWNER' && u.id !== currentUser?.id && (
                    <Tooltip title="Delete or Deactivate Operator">
                      <IconButton size="small" color="error" onClick={() => setDeleteUserDialog(u)}>
                        <Trash2 size={15} />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </Box>
      </Paper>

      {/* Add operator */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Operator Account</DialogTitle>
        <DialogContent sx={{ pt: '12px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField size="small" label="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <TextField size="small" label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <TextField size="small" type="password" label="Password (min 6 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <TextField select size="small" label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <MenuItem value="OPERATOR">Operator</MenuItem>
            <MenuItem value="ADMIN">Admin</MenuItem>
          </TextField>
          <Alert severity="info" sx={{ fontSize: 12 }}>
            Operators can process sales, register customers, record repayments and request cancellations.
            They cannot delete or edit completed transactions, approve reversals, or access owner-only pages.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(false)}>Cancel</Button>
          <Button variant="contained" disabled={!form.username || !form.password || !form.fullName || save.isPending} onClick={() => save.mutate()}>Create Account</Button>
        </DialogActions>
      </Dialog>

      {/* Reset password */}
      <Dialog open={!!resetDialog} onClose={() => setResetDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reset Password — {resetDialog?.fullName}</DialogTitle>
        <DialogContent sx={{ pt: '12px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField size="small" type="password" label="New Password (min 6 chars)" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialog(null)}>Cancel</Button>
          <Button variant="contained" disabled={newPassword.length < 6 || resetPassword.isPending}
            onClick={() => resetPassword.mutate()}>Reset Password</Button>
        </DialogActions>
      </Dialog>

      {/* Smart Delete User Dialog */}
      <Dialog open={!!deleteUserDialog} onClose={() => setDeleteUserDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#C02828' }}>
          Delete / Deactivate Operator
        </DialogTitle>
        <DialogContent sx={{ pt: '10px !important' }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, mb: 1 }}>
            Are you sure you want to remove account "{deleteUserDialog?.fullName}"?
          </Typography>
          <Box sx={{ p: 1.5, bgcolor: '#F8FAFC', borderRadius: 2, mb: 2, border: '1px solid #E2E8F0' }}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              • Username: <b>{deleteUserDialog?.username}</b>
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              • Role: <b>{deleteUserDialog?.role}</b>
            </Typography>
          </Box>
          <Alert severity="info" sx={{ fontSize: 12 }}>
            <b>JMFeeds Smart Delete:</b> If this operator has zero recorded transactions, the account is permanently deleted. If they have recorded sales, expenses, or daily closings, the account is safely deactivated (disabled from login) to protect your financial and audit history.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setDeleteUserDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteUser.isPending}
            onClick={() => deleteUser.mutate(deleteUserDialog.id)}
          >
            {deleteUser.isPending ? 'Processing...' : 'Confirm Delete / Deactivate'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack(null)}>
        <Alert severity={snack?.type} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
