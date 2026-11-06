import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Typography, Paper, TextField, Switch, FormControlLabel,
  Tabs, Tab, Snackbar, Alert, Divider, Chip, Grid, IconButton, InputAdornment,
  CircularProgress, Stack
} from '@mui/material';
import { Eye, EyeOff, User, Lock, Shield, CheckCircle2 } from 'lucide-react';
import api from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

export default function Settings() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { user: authUser, updateUser } = useAuthStore();
  const isOwner = authUser?.role === 'OWNER' || authUser?.role === 'ADMIN';

  // Check search param for initial tab
  const params = new URLSearchParams(location.search);
  const initialTab = params.get('tab') === 'profile' ? 0 : 0;
  const [tab, setTab] = useState(initialTab);

  const [snack, setSnack] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Business settings query
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data,
    enabled: isOwner,
  });

  // Current user profile query
  const { data: profileData, refetch: refetchProfile } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/auth/me')).data,
  });

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    fullName: authUser?.fullName || '',
    email: authUser?.email || '',
    phone: authUser?.phone || '',
  });

  useEffect(() => {
    if (profileData) {
      setProfileForm({
        fullName: profileData.fullName || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
      });
    }
  }, [profileData]);

  // Password Change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Business Settings Form
  const [settingsForm, setSettingsForm] = useState<any>({});
  useEffect(() => {
    if (settings) setSettingsForm(settings);
  }, [settings]);

  // Profile Save Mutation
  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put('/auth/profile', profileForm);
      return res.data;
    },
    onSuccess: (data) => {
      updateUser(data.user);
      refetchProfile();
      setSnack({ msg: 'Profile updated successfully! You can now log in using your updated email or username.', type: 'success' });
    },
    onError: (e: any) => {
      setSnack({ msg: e.response?.data?.error ?? 'Failed to update profile', type: 'error' });
    },
  });

  // Password Change Mutation
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error('New password and confirmation do not match.');
      }
      if (passwordForm.newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long.');
      }
      const res = await api.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSnack({ msg: data.message || 'Password changed successfully! Keep your new password safe.', type: 'success' });
    },
    onError: (e: any) => {
      setSnack({ msg: e.message || e.response?.data?.error || 'Failed to change password', type: 'error' });
    },
  });

  // Business Settings Save Mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => (await api.put('/settings', settingsForm)).data,
    onSuccess: () => {
      setSnack({ msg: 'Business settings saved', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e: any) => setSnack({ msg: e.response?.data?.error ?? 'Failed to save settings', type: 'error' }),
  });

  const setBusiness = (k: string, v: any) => setSettingsForm((f: any) => ({ ...f, [k]: v }));

  return (
    <Box sx={{ maxWidth: 960 }}>
      {/* Navigation Tabs */}
      <Paper sx={{ borderRadius: 2.5, px: 1, mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 14,
              minHeight: 48,
            },
          }}
        >
          <Tab icon={<User size={16} />} iconPosition="start" label="My Profile & Security" />
          {isOwner && <Tab label="General" />}
          {isOwner && <Tab label="Stock & Alerts" />}
          {isOwner && <Tab label="Payment Methods" />}
          {isOwner && <Tab label="Optional Modules" />}
          {isOwner && <Tab label="System Security" />}
        </Tabs>
      </Paper>

      {/* TAB 0: MY PROFILE & PASSWORD CHANGE */}
      {tab === 0 && (
        <Grid container spacing={3}>
          {/* Left: Profile Information */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ borderRadius: 3, p: 3.5, height: '100%', border: '1px solid #E3EBF3' }} elevation={0}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#EAF7EF', color: '#23A455', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={18} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: 18, color: '#123A52' }}>
                  Personal Profile
                </Typography>
              </Box>

              <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
                Update your contact details. Setting your email allows you to log in with either your username or email address.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', bgcolor: '#F5F9FC', p: 1.5, borderRadius: 2 }}>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 500 }}>
                    Username:
                  </Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#123A52' }}>
                    {profileData?.username || authUser?.username}
                  </Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  <Chip
                    label={authUser?.role === 'OWNER' ? 'Owner / Admin' : 'Operator'}
                    size="small"
                    sx={{
                      bgcolor: authUser?.role === 'OWNER' ? '#EAF7EF' : '#EDF4F9',
                      color: authUser?.role === 'OWNER' ? '#1B7A3E' : '#1D5068',
                      fontWeight: 700,
                    }}
                  />
                </Box>

                <TextField
                  label="Full Name"
                  size="small"
                  fullWidth
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                />

                <TextField
                  label="Email Address (Used for Login)"
                  placeholder="admin@jmfeeds.co.ke"
                  size="small"
                  fullWidth
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  helperText="Once saved, you can log in using this email address or your username."
                />

                <TextField
                  label="Phone Number"
                  placeholder="+254 712 345678"
                  size="small"
                  fullWidth
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                />

                <Box sx={{ pt: 1 }}>
                  <Button
                    variant="contained"
                    onClick={() => saveProfileMutation.mutate()}
                    disabled={saveProfileMutation.isPending}
                    sx={{
                      bgcolor: '#23A455',
                      fontWeight: 700,
                      borderRadius: 2,
                      px: 3,
                      textTransform: 'none',
                      '&:hover': { bgcolor: '#1E8D49' },
                    }}
                  >
                    {saveProfileMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Save Profile Details'}
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Right: Change Password Card */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ borderRadius: 3, p: 3.5, height: '100%', border: '1px solid #E3EBF3' }} elevation={0}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#FEEFEF', color: '#D32F2F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Lock size={18} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: 18, color: '#123A52' }}>
                  Change Password
                </Typography>
              </Box>

              <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
                Replace default credentials with your private password so no external developers or unauthorized individuals can access your system.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.2 }}>
                <TextField
                  label="Current Password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  size="small"
                  fullWidth
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowCurrentPassword(!showCurrentPassword)} edge="end">
                          {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  label="New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  size="small"
                  fullWidth
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  helperText="Minimum 6 characters. Use letters, numbers, and symbols for high security."
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowNewPassword(!showNewPassword)} edge="end">
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  label="Confirm New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  size="small"
                  fullWidth
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />

                <Box sx={{ pt: 1 }}>
                  <Button
                    variant="contained"
                    onClick={() => changePasswordMutation.mutate()}
                    disabled={changePasswordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword}
                    sx={{
                      bgcolor: '#123A52',
                      color: '#fff',
                      fontWeight: 700,
                      borderRadius: 2,
                      px: 3,
                      textTransform: 'none',
                      '&:hover': { bgcolor: '#0D2738' },
                    }}
                  >
                    {changePasswordMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Update My Password'}
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* TAB 1: GENERAL BUSINESS SETTINGS */}
      {tab === 1 && isOwner && (
        <Paper sx={{ borderRadius: 3, p: 3.5, border: '1px solid #E3EBF3' }} elevation={0}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: '#123A52' }}>
            General Business Information
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
            Business identity details used on printable sales receipts, customer debt statements, and purchase orders.
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
            <TextField label="Business Name" size="small" value={settingsForm.businessName ?? ''} onChange={(e) => setBusiness('businessName', e.target.value)} />
            <TextField label="Currency" size="small" value={settingsForm.currency ?? ''} onChange={(e) => setBusiness('currency', e.target.value)} />
            <TextField label="Contact Phone" size="small" value={settingsForm.contactPhone ?? ''} onChange={(e) => setBusiness('contactPhone', e.target.value)} />
            <TextField label="Contact Email" size="small" value={settingsForm.contactEmail ?? ''} onChange={(e) => setBusiness('contactEmail', e.target.value)} />
            <TextField label="Physical Address" size="small" value={settingsForm.physicalAddress ?? ''} onChange={(e) => setBusiness('physicalAddress', e.target.value)} />
            <TextField label="Time Zone" size="small" value={settingsForm.timeZone ?? ''} onChange={(e) => setBusiness('timeZone', e.target.value)} />
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField label="Receipt Footer Message" size="small" fullWidth value={settingsForm.receiptFooter ?? ''} onChange={(e) => setBusiness('receiptFooter', e.target.value)} />
            </Box>
          </Box>

          <Box sx={{ mt: 3.5 }}>
            <Button variant="contained" onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending} sx={{ bgcolor: '#23A455', fontWeight: 700, borderRadius: 2, px: 3, textTransform: 'none', '&:hover': { bgcolor: '#1E8D49' } }}>
              Save Business Details
            </Button>
          </Box>
        </Paper>
      )}

      {/* TAB 2: STOCK & ALERTS */}
      {tab === 2 && isOwner && (
        <Paper sx={{ borderRadius: 3, p: 3.5, border: '1px solid #E3EBF3' }} elevation={0}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: '#123A52' }}>
            Inventory Policies & Automated Alerts
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
            Configure stock alert thresholds and rules governing out-of-stock operations.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 440 }}>
            <TextField
              label="Default Low-stock Threshold (Bags/Units)"
              size="small"
              type="number"
              value={settingsForm.lowStockThreshold ?? 5}
              onChange={(e) => setBusiness('lowStockThreshold', Number(e.target.value))}
            />
            <TextField
              label="Expiry Alert (Days before expiry)"
              size="small"
              type="number"
              value={settingsForm.expiryAlertDays ?? 30}
              onChange={(e) => setBusiness('expiryAlertDays', Number(e.target.value))}
            />
            <FormControlLabel
              control={<Switch checked={!!settingsForm.allowNegativeStock} onChange={(e) => setBusiness('allowNegativeStock', e.target.checked)} />}
              label="Allow negative stock (Sell beyond available quantity)"
            />
            <Divider />
            <Typography variant="caption" color="text.secondary">
              Costing Model: Exact historical purchase cost per SaleItem. Completed transactions always retain the cost applied at the transaction moment.
            </Typography>
          </Box>

          <Box sx={{ mt: 3.5 }}>
            <Button variant="contained" onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending} sx={{ bgcolor: '#23A455', fontWeight: 700, borderRadius: 2, px: 3, textTransform: 'none', '&:hover': { bgcolor: '#1E8D49' } }}>
              Save Stock Policies
            </Button>
          </Box>
        </Paper>
      )}

      {/* TAB 3: PAYMENT METHODS */}
      {tab === 3 && isOwner && (
        <Paper sx={{ borderRadius: 3, p: 3.5, border: '1px solid #E3EBF3' }} elevation={0}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: '#123A52' }}>
            Manual Payment Methods
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
            Payment methods are selectable chips for manual recording at checkout. No external payment gateway is active.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              ['Cash', 'Physical currency accepted at the shop counter'],
              ['Bank', 'Direct bank deposit or bank transfer manually verified'],
              ['Other', 'Mobile money, till, or check numbers entered manually'],
            ].map(([name, desc]) => (
              <Box key={name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #E3EBF3', borderRadius: 2, p: 2 }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#123A52' }}>{name}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{desc}</Typography>
                </Box>
                <Chip label="Active" size="small" sx={{ bgcolor: '#EAF7EF', color: '#1B7A3E', fontWeight: 700 }} />
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* TAB 4: OPTIONAL MODULES */}
      {tab === 4 && isOwner && (
        <Paper sx={{ borderRadius: 3, p: 3.5, border: '1px solid #E3EBF3' }} elevation={0}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: '#123A52' }}>
            Optional Modules & Features
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
            Activate or deactivate auxiliary business modules without deleting historical transaction data.
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #E3EBF3', borderRadius: 2.5, p: 2.5, mb: 3 }}>
            <Box sx={{ maxWidth: 520 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#123A52' }}>
                Cosmetic Services & Employee Commissions
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
                Enables hair styling, beauty treatments, service billing, employee commission calculations, and salon stock consumption. When disabled, it remains hidden from ordinary operators.
              </Typography>
            </Box>
            <Switch
              checked={!!settingsForm.enableServices}
              onChange={(e) => setBusiness('enableServices', e.target.checked)}
              color="success"
            />
          </Box>

          <Button variant="contained" onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending} sx={{ bgcolor: '#23A455', fontWeight: 700, borderRadius: 2, px: 3, textTransform: 'none', '&:hover': { bgcolor: '#1E8D49' } }}>
            Save Module Settings
          </Button>
        </Paper>
      )}

      {/* TAB 5: SYSTEM SECURITY & AUDIT */}
      {tab === 5 && isOwner && (
        <Paper sx={{ borderRadius: 3, p: 3.5, border: '1px solid #E3EBF3' }} elevation={0}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#EAF7EF', color: '#23A455', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={18} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#123A52' }}>
              Enterprise Fraud & Security Controls
            </Typography>
          </Box>

          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
            JMFeeds implements a multi-layer defense strategy to safeguard business revenue and prevent employee tampering.
          </Typography>

          <Stack spacing={2}>
            <Alert severity="success" sx={{ fontSize: 13 }}>
              <b>Immutable Transaction History:</b> Finalized sales, purchases, debt repayments, and expenses cannot be deleted or secretly edited. Reversals must be submitted as cancellation requests by operators and explicitly approved by the business owner.
            </Alert>
            <Alert severity="info" sx={{ fontSize: 13 }}>
              <b>Cryptographic Passwords:</b> Passwords are protected using bcrypt salt rounds. Tokens expire after 12 hours of inactivity.
            </Alert>
            <Alert severity="info" sx={{ fontSize: 13 }}>
              <b>Audit Log Trails:</b> Every login, stock adjustment, price change, and approval decision is timestamped and recorded in the audit trail database table.
            </Alert>
          </Stack>
        </Paper>
      )}

      {/* Snackbar feedback */}
      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)}>
        <Alert severity={snack?.type} onClose={() => setSnack(null)} sx={{ borderRadius: 2 }}>
          {snack?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
