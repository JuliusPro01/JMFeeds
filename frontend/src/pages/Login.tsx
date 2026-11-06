import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Checkbox, FormControlLabel,
  Alert, Paper, CircularProgress, IconButton, InputAdornment, Chip
} from '@mui/material';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import api from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import Logo from '../components/Logo';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/auth/login', {
        username: identifier.trim(),
        password,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      navigate('/dashboard');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error ?? 'Login failed. Check your username/email and password.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password) {
      setError('Please enter your username (or email) and password.');
      return;
    }
    loginMutation.mutate();
  };

  const fillCredentials = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setError('');
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#F5F9FC' }}>
      {/* Static Header & Navigation at the top */}
      <PublicNavbar
        currentView="login"
        onNavigate={(sec) => {
          if (sec === 'home') navigate('/');
          else navigate('/#' + sec);
        }}
      />

      {/* Main Login Workspace */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: { xs: 4, md: 6 },
          px: { xs: 2, sm: 3 },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 880,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            borderRadius: 3.5,
            overflow: 'hidden',
            border: '1px solid #DCE6ED',
            boxShadow: '0 12px 48px rgba(18, 58, 82, 0.08)',
            bgcolor: '#FFFFFF',
          }}
        >
          {/* Left: Form Area */}
          <Box
            sx={{
              flex: 1,
              p: { xs: 3.5, sm: 4.5, md: 5 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {/* Top Back link */}
            <Box sx={{ mb: 2 }}>
              <Button
                startIcon={<ArrowLeft size={16} />}
                onClick={() => navigate('/')}
                sx={{
                  color: '#627D98',
                  fontSize: 12.5,
                  textTransform: 'none',
                  p: 0,
                  minWidth: 'auto',
                  '&:hover': { color: '#23A455', bgcolor: 'transparent' },
                }}
              >
                Back to Public Site
              </Button>
            </Box>

            {/* Logo */}
            <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center' }}>
              <Logo height={38} />
            </Box>

            {/* Title & Subtitle */}
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                fontSize: { xs: 24, sm: 27 },
                color: '#123A52',
                letterSpacing: -0.4,
              }}
            >
              Welcome Back!
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: '#5B738B', mt: 0.5, mb: 3 }}>
              Sign in to your account to continue.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2, fontSize: 13 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              {/* Email / Username */}
              <Box sx={{ mb: 2.2 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#123A52', mb: 0.7 }}>
                  Email or Username
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="username or your email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: '#FBFDFE',
                      fontSize: 14,
                      '& fieldset': { borderColor: '#D0DFE8' },
                      '&:hover fieldset': { borderColor: '#23A455' },
                      '&.Mui-focused fieldset': { borderColor: '#23A455' },
                    },
                  }}
                />
              </Box>

              {/* Password */}
              <Box sx={{ mb: 1.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#123A52', mb: 0.7 }}>
                  Password
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: '#8AA3B8' }}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: '#FBFDFE',
                      fontSize: 14,
                      '& fieldset': { borderColor: '#D0DFE8' },
                      '&:hover fieldset': { borderColor: '#23A455' },
                      '&.Mui-focused fieldset': { borderColor: '#23A455' },
                    },
                  }}
                />
              </Box>

              {/* Remember me & Forgot Password */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 3,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      sx={{ color: '#8AA3B8', '&.Mui-checked': { color: '#23A455' } }}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: 13, color: '#47607A', fontWeight: 500 }}>
                      Remember me
                    </Typography>
                  }
                />
                <Typography
                  onClick={() => alert('Please contact the business owner or administrator to reset your password.')}
                  sx={{
                    fontSize: 13,
                    color: '#1E88E5',
                    cursor: 'pointer',
                    fontWeight: 600,
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Forgot password?
                </Typography>
              </Box>

              {/* Login Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loginMutation.isPending}
                sx={{
                  bgcolor: '#23A455',
                  color: '#fff',
                  borderRadius: 2,
                  py: 1.35,
                  fontSize: 15,
                  fontWeight: 700,
                  textTransform: 'none',
                  boxShadow: '0 4px 14px rgba(35, 164, 85, 0.3)',
                  '&:hover': {
                    bgcolor: '#1E8D49',
                    boxShadow: '0 6px 18px rgba(35, 164, 85, 0.4)',
                  },
                }}
              >
                {loginMutation.isPending ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  'Login'
                )}
              </Button>

              {/* Bottom Support Text */}
              <Typography
                align="center"
                sx={{ fontSize: 12.5, color: '#627D98', mt: 3 }}
              >
                Don't have an account?{' '}
                <Box
                  component="span"
                  sx={{ color: '#23A455', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => alert('Please contact your administrator to provision your operator credentials.')}
                >
                  Contact your administrator
                </Box>
              </Typography>

              {/* Quick Login Helper Chips */}
              {/* <Box
                sx={{
                  mt: 3,
                  pt: 2.5,
                  borderTop: '1px dashed #E3EBF3',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <Typography sx={{ fontSize: 11.5, color: '#8AA3B8', fontWeight: 600, textAlign: 'center' }}>
                  Default Credentials (Click to prefill):
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label="ðŸ‘‘ Owner: admin@jmfeeds.co.ke"
                    size="small"
                    onClick={() => fillCredentials('admin@jmfeeds.co.ke', 'admin123')}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: '#EAF7EF',
                      color: '#1B7A3E',
                      fontWeight: 600,
                      fontSize: 11.5,
                      '&:hover': { bgcolor: '#D6EFE0' },
                    }}
                  />
                  <Chip
                    label="ðŸ‘¤ Operator: operator"
                    size="small"
                    onClick={() => fillCredentials('operator', 'operator123')}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: '#EDF4F9',
                      color: '#1D5068',
                      fontWeight: 600,
                      fontSize: 11.5,
                      '&:hover': { bgcolor: '#DCEBF5' },
                    }}
                  />
                </Box>
              </Box> */}
            </form>
          </Box>

          {/* Right: Farm Cows & Burlap Feed Sacks Image Banner */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              width: '46%',
              position: 'relative',
              overflow: 'hidden',
              minHeight: 520,
              bgcolor: '#123A52',
            }}
          >
            <Box
              component="img"
              src={new URL('../assets/cow_feed_banner.png', import.meta.url).href}
              alt="JMFeeds Animal Nutrition & Feed Management"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />

            {/* Gradient Overlay for high-contrast white typography */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(to top, rgba(14, 38, 55, 0.95) 0%, rgba(14, 38, 55, 0.4) 40%, rgba(14, 38, 55, 0.05) 100%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                p: 4,
              }}
            >
              <Typography
                sx={{
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: 26,
                  lineHeight: 1.25,
                  textShadow: '0 2px 10px rgba(0,0,0,0.4)',
                }}
              >
                Better Nutrition.
                <br />
                Healthier Animals.
                <br />
                Greater Profits.
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Professional Footer */}
      <PublicFooter
        onNavigate={(sec) => {
          if (sec === 'home') navigate('/');
          else navigate('/#' + sec);
        }}
      />
    </Box>
  );
}
