import { createTheme } from '@mui/material';

// JMFeeds brand colors — from the mockup
export const brand = {
  green: '#23A455',        // primary brand green
  greenDark: '#1B7A3E',
  navy: '#123A52',         // dark navy sidebar
  navyHover: '#0D2C40',
  navyActive: '#23A455',   // active menu highlight
  bg: '#F5F9FC',           // very light blue page background
  cardBorder: '#E3EBF3',
  red: '#E23B3B',
  orange: '#F2994A',
  blue: '#2D9CDB',
};

const theme = createTheme({
  palette: {
    primary: { main: brand.green, dark: brand.greenDark },
    secondary: { main: brand.navy },
    success: { main: brand.green },
    warning: { main: brand.orange },
    error: { main: brand.red },
    info: { main: brand.blue },
    background: { default: brand.bg, paper: '#FFFFFF' },
    text: { primary: '#172B3A', secondary: '#6B7C93' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { border: `1px solid ${brand.cardBorder}` } } },
    MuiCard: { styleOverrides: { root: { border: `1px solid ${brand.cardBorder}`, boxShadow: '0 1px 3px rgba(16,42,67,0.06)' } } },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 700, color: '#47607A', backgroundColor: '#FAFCFE' } } },
  },
});

export default theme;
