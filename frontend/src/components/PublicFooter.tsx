import { Box, Container, Typography, Grid, Link, Divider, Chip } from '@mui/material';
import {
  Boxes, ShieldCheck, TrendingUp, Phone, Mail, MapPin, CheckCircle2,
  Lock, Award
} from 'lucide-react';
import Logo from './Logo';

interface PublicFooterProps {
  onNavigate?: (section: 'home' | 'features' | 'pricing' | 'about' | 'login') => void;
}

export default function PublicFooter({ onNavigate }: PublicFooterProps) {
  const handleNav = (sec: 'home' | 'features' | 'pricing' | 'about' | 'login') => {
    if (onNavigate) onNavigate(sec);
  };

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: '#0D2738',
        color: '#DCE6ED',
        pt: { xs: 6, md: 8 },
        pb: 4,
        borderTop: '1px solid #1B3E54',
      }}
    >
      <Container maxWidth="lg">
        {/* Top Highlight Banner */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            bgcolor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 3,
            p: { xs: 2.5, md: 3 },
            mb: 6,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                bgcolor: 'rgba(35, 164, 85, 0.15)',
                color: '#2DBB67',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={22} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>
                Better Stock. Higher Profits.
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#8EA6B8' }}>
                Voice of the Farmer JM Feeds · Murang'a Town
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Chip
              icon={<CheckCircle2 size={14} color="#2DBB67" />}
              label="Real-time Stock Ledger"
              size="small"
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.06)', color: '#DCE6ED', fontSize: 12 }}
            />
            <Chip
              icon={<Award size={14} color="#2DBB67" />}
              label="KSh Accounting Ready"
              size="small"
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.06)', color: '#DCE6ED', fontSize: 12 }}
            />
            <Chip
              icon={<Lock size={14} color="#2DBB67" />}
              label="Audit Protected"
              size="small"
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.06)', color: '#DCE6ED', fontSize: 12 }}
            />
          </Box>
        </Box>

        {/* Main Footer Columns */}
        <Grid container spacing={4} sx={{ mb: 6 }}>
          {/* Col 1: Brand & Overview */}
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  bgcolor: '#fff',
                  borderRadius: 2,
                  px: 1.5,
                  py: 0.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <Logo height={30} />
              </Box>
            </Box>
            <Typography sx={{ fontSize: 13.5, lineHeight: 1.7, color: '#9BB2C4', mb: 2.5, pr: { md: 2 } }}>
              Built for Voice of the Farmer JM FEEDS in Murang'a Town. Tracks every bag of dairy meal and poultry feed, farming supplies, customer debts, M-Pesa payments, and daily profit — all secured and auditable.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2DBB67' }} />
              <Typography sx={{ fontSize: 12, color: '#2DBB67', fontWeight: 600 }}>
                System Operational  Online
              </Typography>
            </Box>
          </Grid>

          {/* Col 2: Core Capabilities */}
          <Grid item xs={6} sm={4} md={2.5}>
            <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: '#fff', mb: 2, letterSpacing: 0.2 }}>
              Core Modules
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              {[
                'Real-Time Stock Movement',
                'Multi-Unit Unit Conversions',
                'POS & Fast Checkout',
                'Credit Sales & Receivables',
                'Purchases & Goods Receiving',
                'Profit & Loss Intelligence',
                'Cosmetics & Commissions',
              ].map((item) => (
                <Typography
                  key={item}
                  onClick={() => handleNav('features')}
                  sx={{
                    fontSize: 13,
                    color: '#9BB2C4',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    '&:hover': { color: '#2DBB67', transform: 'translateX(3px)' },
                  }}
                >
                  {item}
                </Typography>
              ))}
            </Box>
          </Grid>

          {/* Col 3: Navigation & Portals */}
          <Grid item xs={6} sm={4} md={2.5}>
            <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: '#fff', mb: 2, letterSpacing: 0.2 }}>
              Navigation
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              {[
                { label: 'Public Home', key: 'home' as const },
                { label: 'System Features', key: 'features' as const },
                { label: 'About JMFeeds', key: 'about' as const },
                { label: 'Owner / Operator Login', key: 'login' as const },
              ].map((item) => (
                <Typography
                  key={item.label}
                  onClick={() => handleNav(item.key)}
                  sx={{
                    fontSize: 13,
                    color: '#9BB2C4',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    '&:hover': { color: '#2DBB67', transform: 'translateX(3px)' },
                  }}
                >
                  {item.label}
                </Typography>
              ))}
            </Box>
          </Grid>

          {/* Col 4: Business & Support */}
          <Grid item xs={12} sm={4} md={3}>
            <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: '#fff', mb: 2, letterSpacing: 0.2 }}>
              Shop Location & Contact
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2 }}>
                <MapPin size={16} color="#2DBB67" style={{ marginTop: 3, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 13, color: '#9BB2C4', lineHeight: 1.5 }}>
                  Murang'a Town, Kenya
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <Phone size={16} color="#2DBB67" style={{ flexShrink: 0 }} />
                <Typography sx={{ fontSize: 13, color: '#9BB2C4' }}>
                  0726 704 623 / +254 726 704623
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <Mail size={16} color="#2DBB67" style={{ flexShrink: 0 }} />
                <Typography sx={{ fontSize: 13, color: '#9BB2C4' }}>
                  info@jmfeeds.co.ke
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', mb: 3 }} />

        {/* Bottom Bar: Copyright & Compliance */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
            textAlign: { xs: 'center', sm: 'left' },
          }}
        >
          <Typography sx={{ fontSize: 12, color: '#7E97A8' }}>
            © {new Date().getFullYear()} Feed Empire .All rights reserved. Designed and developed by <Link href="https://github.com/JohnMwihaki" target="_blank" rel="noopener" sx={{ color: '#2DBB67', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>John Kimani</Link>.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="#privacy" underline="hover" sx={{ fontSize: 12, color: '#7E97A8' }}>
              Kenya Data Protection Act (2019)
            </Link>
            <Link href="#security" underline="hover" sx={{ fontSize: 12, color: '#7E97A8' }}>
              Immutable Transaction Policy
            </Link>
            <Link href="#terms" underline="hover" sx={{ fontSize: 12, color: '#7E97A8' }}>
              Terms of Use
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

