import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import {
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider, IconButton, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Badge, Menu, MenuItem, Avatar, Tooltip,
  Collapse,
} from '@mui/material';
import {
  Menu as MenuIcon, LayoutDashboard, ShoppingCart, Boxes, Truck,
  UsersRound, Wallet, ReceiptText, BarChart3, ShieldCheck, Users, Scissors,
  Sunrise, Settings, LogOut, Bell, Search as SearchIcon,
} from 'lucide-react';
import Logo from './Logo';
import { useAuthStore } from '../store/useAuthStore';

const drawerWidth = 232;

type NavItem = { label: string; icon: React.ReactNode; path: string; ownerOnly?: boolean };

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';

  // Periodic keep-alive ping to ensure backend stays active while browser is open
  useEffect(() => {
    const keepAlive = setInterval(() => {
      api.get('/health').catch(() => {});
    }, 10 * 60 * 1000);
    return () => clearInterval(keepAlive);
  }, []);

  // Settings for optional module visibility
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data,
  });
  const servicesEnabled = settings?.enableServices ?? false;

  // Notifications
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data,
    refetchInterval: 60_000,
  });
  const unread = notifData?.unreadCount ?? 0;

  const markAllRead = useMutation({
    mutationFn: async () => api.post('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const mainNav: NavItem[] = [
    { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/dashboard' },
    { label: 'Sales / POS', icon: <ShoppingCart size={18} />, path: '/pos' },
    { label: 'Inventory', icon: <Boxes size={18} />, path: '/inventory' },
    { label: 'Purchases', icon: <Truck size={18} />, path: '/purchases' },
    { label: 'Suppliers', icon: <Truck size={18} />, path: '/suppliers' },
    { label: 'Customers', icon: <UsersRound size={18} />, path: '/customers' },
    { label: 'Debts', icon: <Wallet size={18} />, path: '/debts' },
    { label: 'Expenses', icon: <ReceiptText size={18} />, path: '/expenses' },
    { label: 'Reports & Analytics', icon: <BarChart3 size={18} />, path: '/reports' },
  ];

  const adminNav: NavItem[] = [
    { label: 'Approvals & Audit', icon: <ShieldCheck size={18} />, path: '/approvals', ownerOnly: true },
    { label: 'Users', icon: <Users size={18} />, path: '/users', ownerOnly: true },
    { label: 'Settings', icon: <Settings size={18} />, path: '/settings', ownerOnly: true },
  ];

  const servicesNav: NavItem[] = (servicesEnabled || isOwner)
    ? [{ label: 'Optional Services', icon: <Scissors size={18} />, path: '/services', ownerOnly: !servicesEnabled }]
    : [];

  const ownerFlowNav: NavItem[] = [
    { label: 'Daily Closing', icon: <Sunrise size={18} />, path: '/reconciliation', ownerOnly: true },
  ];

  const renderItem = (item: NavItem) => {
    if (item.ownerOnly && !isOwner) return null;
    const active = location.pathname === item.path;
    return (
      <ListItem key={item.path} disablePadding sx={{ px: 1.2, mb: 0.3 }}>
        <ListItemButton
          onClick={() => { navigate(item.path); setMobileOpen(false); }}
          selected={active}
          sx={{
            borderRadius: 1.5, py: 0.9,
            color: '#B9CBD8', '& .MuiListItemIcon-root': { color: 'inherit', minWidth: 38 },
            '&.Mui-selected': { backgroundColor: '#1D5068', color: '#fff' },
            '&.Mui-selected:hover': { backgroundColor: '#24596f' },
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)', color: '#E7F0F5' },
          }}
        >
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 13.5, fontWeight: active ? 600 : 500 }} />
        </ListItemButton>
      </ListItem>
    );
  };

  const visibleAdminNav = adminNav.filter((i) => !i.ownerOnly || isOwner);

  const drawer = (
    <Box sx={{ minHeight: '100%', height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#123A52' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
        <Logo height={34} light />
      </Box>
      <Box sx={{ px: 2.5, pb: 1 }}>
        <Typography sx={{ fontSize: 10.5, color: '#5E7E93', textTransform: 'uppercase', letterSpacing: 1 }}>
          Main Menu
        </Typography>
      </Box>
      <List sx={{ flexGrow: 1, px: 0, overflowY: 'auto' }}>
        {mainNav.map(renderItem)}
        {servicesNav.map(renderItem)}
        {ownerFlowNav.map(renderItem)}
        {visibleAdminNav.length > 0 && (
          <>
            <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
              <Typography sx={{ fontSize: 10.5, color: '#5E7E93', textTransform: 'uppercase', letterSpacing: 1 }}>
                Administration
              </Typography>
            </Box>
            {visibleAdminNav.map(renderItem)}
          </>
        )}
      </List>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
      <List sx={{ mt: 'auto', bgcolor: '#123A52', pb: { xs: 3, md: 1 } }}>
        <ListItem disablePadding sx={{ px: 1.2, mb: 1 }}>
          <ListItemButton onClick={() => { logout(); navigate('/login'); }} sx={{ borderRadius: 1.5, py: 0.9, color: '#B9CBD8', '& .MuiListItemIcon-root': { color: 'inherit', minWidth: 38 } }}>
            <ListItemIcon><LogOut size={18} /></ListItemIcon>
            <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: 13.5 }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  const menuItems = [...mainNav, ...servicesNav, ...ownerFlowNav, ...adminNav].filter((i) => !i.ownerOnly || isOwner);
  const current = menuItems.find((i) => i.path === location.pathname);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F5F9FC' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` }, ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.default', borderBottom: '1px solid #E3EBF3', color: 'text.primary',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 1, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, maxWidth: 360, bgcolor: '#fff', border: '1px solid #E3EBF3', borderRadius: 2, px: 1.5, py: 0.7 }}>
            <SearchIcon size={16} color="#8AA3B8" />
            <input
              placeholder="Search anything..."
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13, background: 'transparent' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const q = (e.target as HTMLInputElement).value.trim().toLowerCase();
                  if (!q) return;
                  if (q.includes('sale') || q.includes('pos')) navigate('/pos');
                  else if (q.includes('stock') || q.includes('product')) navigate('/inventory');
                  else if (q.includes('debt') || q.includes('credit')) navigate('/debts');
                  else if (q.includes('report')) navigate('/reports');
                  else navigate('/inventory');
                }
              }}
            />
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton onClick={(e) => setNotifAnchor(e.currentTarget)} sx={{ color: '#47607A' }}>
            <Badge badgeContent={unread} color="error" max={9}>
              <Bell size={19} />
            </Badge>
          </IconButton>
          <Menu anchorEl={notifAnchor} open={!!notifAnchor} onClose={() => setNotifAnchor(null)} PaperProps={{ sx: { width: 340, maxHeight: 420, mt: 1.5, borderRadius: 2, border: '1px solid #E3EBF3' } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, pt: 1.5, pb: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Notifications</Typography>
              <Typography onClick={() => markAllRead.mutate()} sx={{ fontSize: 12, color: 'primary.main', cursor: 'pointer' }}>
                Mark all read
              </Typography>
            </Box>
            {(notifData?.notifications ?? []).slice(0, 8).map((n: any) => (
              <MenuItem key={n.id} onClick={() => setNotifAnchor(null)} sx={{ display: 'block', borderBottom: '1px solid #F0F4F8', py: 1.2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', mt: '6px', bgcolor: n.type === 'DANGER' ? 'error.main' : n.type === 'WARNING' ? 'warning.main' : n.type === 'SUCCESS' ? 'success.main' : 'info.main', flexShrink: 0, opacity: n.isRead ? 0.25 : 1 }} />
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{n.title}</Typography>
                    <Typography sx={{ fontSize: 12.2, color: 'text.secondary', whiteSpace: 'normal' }}>{n.message}</Typography>
                  </Box>
                </Box>
              </MenuItem>
            ))}
            {unread === 0 && (notifData?.notifications ?? []).length === 0 && (
              <MenuItem disabled>No notifications yet</MenuItem>
            )}
          </Menu>

          <Box onClick={(e) => setProfileAnchor(e.currentTarget)} sx={{ display: 'flex', alignItems: 'center', gap: 1.2, cursor: 'pointer', ml: 1 }}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: '#23A455', fontSize: 14, fontWeight: 700 }}>
              {(user?.fullName ?? 'U').split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.1 }}>{user?.fullName}</Typography>
              <Typography sx={{ fontSize: 11, color: user?.role === 'OWNER' ? '#23A455' : '#47607A', fontWeight: 600 }}>
                {user?.role === 'OWNER' ? 'Admin ⌄' : 'Operator ⌄'}
              </Typography>
            </Box>
          </Box>
          <Menu anchorEl={profileAnchor} open={!!profileAnchor} onClose={() => setProfileAnchor(null)} PaperProps={{ sx: { mt: 1.5, borderRadius: 2, border: '1px solid #E3EBF3', minWidth: 200 } }}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#123A52' }}>{user?.fullName}</Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{user?.email || user?.username}</Typography>
            </Box>
            <Divider />
            <MenuItem sx={{ fontSize: 13.5 }} onClick={() => { setProfileAnchor(null); navigate('/settings?tab=profile'); }}>
              My Profile & Password
            </MenuItem>
            {isOwner && (
              <MenuItem sx={{ fontSize: 13.5 }} onClick={() => { setProfileAnchor(null); navigate('/settings'); }}>
                Business Settings
              </MenuItem>
            )}
            <Divider />
            <MenuItem sx={{ fontSize: 13.5, color: 'error.main' }} onClick={() => { logout(); navigate('/login'); }}>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              border: 'none',
              bgcolor: '#123A52',
              backgroundImage: 'none',
              height: '100dvh',
              minHeight: '100%',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent" open
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, border: 'none', bgcolor: '#123A52' } }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Content */}
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, width: { md: `calc(100% - ${drawerWidth}px)`, overflow: 'auto' } }}>
        <Toolbar />
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, fontSize: 24 }}>{current?.label ?? 'FeedPro'}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            {current?.label === 'Dashboard' ? "Here's what's happening with your business today." : ' '}
          </Typography>
        </Box>
        <Outlet />
      </Box>
    </Box>
  );
}
