import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00e6d2', light: '#7dd3fc', dark: '#0ea5e9', contrastText: '#021421' },
    secondary: { main: '#7dd3fc', light: '#a5f3fc', dark: '#38bdf8', contrastText: '#041025' },
    background: { default: '#041020', paper: 'rgba(6, 14, 28, 0.94)' },
    text: { primary: '#e8f4f8', secondary: '#94a3b8' },
    success: { main: '#22c55e' },
    warning: { main: '#fbbf24' },
    error: { main: '#f43f5e' },
  },
  shape: { borderRadius: 18 },
  typography: {
    fontFamily: [
      'Inter',
      'system-ui',
      '-apple-system',
      'Segoe UI',
      'Roboto',
      'Helvetica',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: { fontWeight: 900, letterSpacing: '-0.05em' },
    h2: { fontWeight: 900, letterSpacing: '-0.04em' },
    h3: { fontWeight: 900, letterSpacing: '-0.03em' },
    h4: { fontWeight: 800 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          minHeight: '100vh',
          background:
            'radial-gradient(900px 420px at 8% 12%, rgba(0,230,210,0.16), transparent 58%), radial-gradient(850px 420px at 88% 14%, rgba(125,211,252,0.14), transparent 55%), linear-gradient(160deg, #061a24 0%, #07222f 40%, #062030 70%, #041820 100%)',
          color: '#e8f4f8',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(4, 12, 24, 0.94)',
          borderBottom: '1px solid rgba(0,230,210,0.16)',
          backdropFilter: 'blur(12px)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          borderRadius: 12,
        },
        contained: {
          boxShadow: '0 14px 32px rgba(0,230,210,0.18)',
        },
        outlined: {
          borderColor: 'rgba(0,230,210,0.32)',
          color: '#e8f4f8',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(0,230,210,0.16)',
          backgroundColor: 'rgba(5, 18, 36, 0.88)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 30px 100px rgba(0, 0, 0, 0.40)',
          transition: 'transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 34px 110px rgba(0, 0, 0, 0.45)',
            borderColor: 'rgba(0,230,210,0.22)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 14,
            backgroundColor: 'rgba(10, 22, 40, 0.85)',
            '& fieldset': {
              borderColor: 'rgba(255,255,255,0.08)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0,230,210,0.24)',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'rgba(0,230,210,0.6)',
              boxShadow: '0 0 0 3px rgba(0,230,210,0.12)',
            },
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 160ms ease',
          '&:hover': { backgroundColor: 'rgba(0,230,210,0.05)' },
        },
      },
    },
  },
})

