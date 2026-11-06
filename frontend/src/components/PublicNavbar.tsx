import React from 'react';
import { AppBar, Toolbar, Box, Button, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import { Menu as MenuIcon, X } from 'lucide-react';
import Logo from './Logo';

interface PublicNavbarProps {
  currentView?: 'home' | 'login' | 'features' | 'pricing' | 'about';
  onNavigate: (section: 'home' | 'features' | 'pricing' | 'about' | 'login') => void;
}

export default function PublicNavbar({ currentView = 'home', onNavigate }: PublicNavbarProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navItems: { label: string; key: 'home' | 'features' | 'pricing' | 'about' }[] = [
    { label: 'Home', key: 'home' },
    { label: 'Features', key: 'features' },
    { label: 'About', key: 'about' },
  ];

  const handleNav = (key: 'home' | 'features' | 'pricing' | 'about' | 'login') => {
    onNavigate(key);
    setMobileOpen(false);
  };

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        color="inherit"
        sx={{
          bgcolor: '#FFFFFF',
          borderBottom: '1px solid #E3EBF3',
          zIndex: 1100,
          top: 0,
        }}
      >
        <Toolbar
          sx={{
            maxWidth: 1240,
            width: '100%',
            mx: 'auto',
            px: { xs: 2, sm: 3 },
            height: 68,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Brand Logo */}
          <Box
            onClick={() => handleNav('home')}
            sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Logo height={38} />
          </Box>

          {/* Desktop Navigation Links */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 3.5 }}>
            {navItems.map((item) => {
              const active = currentView === item.key;
              return (
                <Button
                  key={item.key}
                  onClick={() => handleNav(item.key)}
                  sx={{
                    color: active ? '#23A455' : '#47607A',
                    fontWeight: active ? 700 : 500,
                    fontSize: 14.5,
                    textTransform: 'none',
                    px: 1,
                    minWidth: 'auto',
                    position: 'relative',
                    '&:hover': { color: '#23A455', bgcolor: 'transparent' },
                    ...(active && {
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: -18,
                        left: 0,
                        right: 0,
                        height: 2.5,
                        bgcolor: '#23A455',
                        borderRadius: 1,
                      },
                    }),
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>

          {/* Right Action: Login Text link & Login Green Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              onClick={() => handleNav('login')}
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                color: currentView === 'login' ? '#23A455' : '#47607A',
                fontWeight: 600,
                fontSize: 14,
                textTransform: 'none',
                '&:hover': { color: '#23A455', bgcolor: 'transparent' },
              }}
            >
              Login
            </Button>

            <Button
              variant="contained"
              onClick={() => handleNav('login')}
              sx={{
                bgcolor: '#23A455',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13.5,
                textTransform: 'none',
                borderRadius: '20px',
                px: 3,
                py: 0.85,
                boxShadow: '0 2px 8px rgba(35, 164, 85, 0.25)',
                '&:hover': {
                  bgcolor: '#1E8D49',
                  boxShadow: '0 4px 12px rgba(35, 164, 85, 0.35)',
                },
              }}
            >
              Login
            </Button>

            {/* Mobile Menu Icon */}
            <IconButton
              onClick={() => setMobileOpen(true)}
              sx={{ display: { md: 'none' }, color: '#123A52', ml: 0.5 }}
            >
              <MenuIcon size={22} />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{ sx: { width: 280, p: 2.5 } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Logo height={32} />
          <IconButton onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </IconButton>
        </Box>
        <List sx={{ pt: 0 }}>
          {navItems.map((item) => (
            <ListItem key={item.key} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => handleNav(item.key)}
                sx={{
                  borderRadius: 1.5,
                  bgcolor: currentView === item.key ? '#EAF7EF' : 'transparent',
                  color: currentView === item.key ? '#23A455' : '#123A52',
                  fontWeight: currentView === item.key ? 700 : 500,
                }}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
          <ListItem disablePadding sx={{ mt: 2 }}>
            <Button
              fullWidth
              variant="contained"
              onClick={() => handleNav('login')}
              sx={{
                bgcolor: '#23A455',
                color: '#fff',
                borderRadius: '20px',
                py: 1,
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': { bgcolor: '#1E8D49' },
              }}
            >
              Sign In to System
            </Button>
          </ListItem>
        </List>
      </Drawer>
    </>
  );
}
