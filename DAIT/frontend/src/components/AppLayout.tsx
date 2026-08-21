import type { PropsWithChildren } from 'react'
import {
  AppBar,
  Box,
  Container,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'

type Props = PropsWithChildren<{
  title?: string
  onLogout?: () => void
}>

export function AppLayout({ title = 'DAIT', onLogout, children }: Props) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: 'linear-gradient(160deg, #061a24 0%, #07222f 40%, #062030 70%, #041820 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(0,230,210,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,230,210,0.06) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
          opacity: 0.12,
          pointerEvents: 'none',
        },
      }}
    >
      <AppBar position="sticky" elevation={0} sx={{ background: 'rgba(5, 12, 26, 0.96)', backdropFilter: 'blur(14px)' }}>
        <Toolbar sx={{ gap: 2 }}>
          <Box
            component="img"
            src="/dait-logo.png"
            alt="DAIT"
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              bgcolor: 'rgba(255,255,255,0.95)',
              p: 0.3,
              animation: 'pulseGlow 3.2s ease-in-out infinite',
              '@keyframes pulseGlow': {
                '0%': { transform: 'scale(1)', boxShadow: '0 0 0 rgba(0,230,210,0.0)' },
                '50%': { transform: 'scale(1.03)', boxShadow: '0 0 18px rgba(0,230,210,0.25)' },
                '100%': { transform: 'scale(1)', boxShadow: '0 0 0 rgba(0,230,210,0.0)' },
              },
            }}
          />
          <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: 0.2 }}>
            {title}
          </Typography>
          <Box sx={{ flex: 1 }} />
          {onLogout ? (
            <IconButton color="inherit" onClick={onLogout} aria-label="Logout">
              <LogoutRoundedIcon />
            </IconButton>
          ) : null}
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 4, flex: 1, position: 'relative', zIndex: 1 }}>{children}</Container>

      <Box
        component="footer"
        sx={{
          py: 2,
          borderTop: '1px solid rgba(0,230,210,0.12)',
          bgcolor: 'rgba(5, 12, 28, 0.92)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Container
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} DAIT
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Deep AI Thrombus • Secure clinical workflow
          </Typography>
        </Container>
      </Box>
    </Box>
  )
}

