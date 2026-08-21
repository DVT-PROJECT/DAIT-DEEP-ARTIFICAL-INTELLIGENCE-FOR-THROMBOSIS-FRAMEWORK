import { Box, Button, Stack, Typography, Paper, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export function Splash() {
  const theme = useTheme();
  const nav = useNavigate();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        background: theme.palette.mode === 'dark' ? '#061020' : '#081423',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 4, sm: 5, md: 6 },
        '@keyframes pulse': {
          '0%, 100%': { opacity: 0.7 },
          '50%': { opacity: 1 },
        },
        '@keyframes floatLogo': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-18px)' },
        },
      }}
    >
      {/* Ambient background */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '46px 46px',
          opacity: 0.45,
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '8%',
          left: { xs: '8%', md: '6%' },
          width: { xs: 260, md: 540 },
          height: { xs: 260, md: 540 },
          background: `radial-gradient(circle, ${theme.palette.primary.light}22 0%, transparent 60%)`,
          filter: 'blur(110px)',
          animation: 'pulse 14s ease-in-out infinite',
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '6%',
          right: { xs: '8%', md: '6%' },
          width: { xs: 240, md: 520 },
          height: { xs: 240, md: 520 },
          background: `radial-gradient(circle, ${theme.palette.secondary.light}22 0%, transparent 65%)`,
          filter: 'blur(105px)',
          animation: 'pulse 18s ease-in-out infinite',
          zIndex: 0,
        }}
      />

      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 1080,
          background: theme.palette.background.paper,
          backdropFilter: 'blur(28px)',
          border: '1px solid rgba(56,189,248,0.18)',
          borderRadius: { xs: 3, md: 5 },
          p: { xs: 3, sm: 4, md: 6 },
          position: 'relative',
          zIndex: 2,
          boxShadow: '0 32px 110px rgba(0, 0, 0, 0.28)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            px: 2.5,
            py: 1,
            borderRadius: 999,
            background: 'rgba(56,189,248,0.08)',
            border: '1px solid rgba(56,189,248,0.14)',
            color: theme.palette.primary.light,
            fontSize: '0.75rem',
            letterSpacing: 1.2,
            fontWeight: 700,
            zIndex: 3,
          }}
        >
          Web portal
        </Box>
        <Stack spacing={4}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                flexWrap: 'wrap',
                gap: 2,
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
              }}
            >
              <Box
                component="img"
                src="/dait-logo.png"
                alt="DAIT logo"
                sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: theme.palette.background.default, p: 0.5 }}
              />
              <Box>
                <Typography variant="overline" sx={{ color: theme.palette.primary.light, fontWeight: 800, letterSpacing: 1.4 }}>
                  DAIT.io
                </Typography>
                <Typography variant="body2" color={theme.palette.text.secondary}>
                  Clinical AI Thrombus Diagnostics
                </Typography>
              </Box>
            </Box>
            <Typography variant="button" sx={{ color: theme.palette.secondary.light, letterSpacing: 1.3 }}>
              AI-powered ultrasound interpretation
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '420px 1fr' },
              gap: { xs: 3, md: 5 },
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                position: 'relative',
                borderRadius: 5,
                p: 3,
                background: 'rgba(56,189,248,0.08)',
                border: '1px solid rgba(56,189,248,0.18)',
                boxShadow: '0 24px 64px rgba(34,211,238,0.14)',
                animation: loaded ? 'floatLogo 8s ease-in-out infinite' : 'none',
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  aspectRatio: '1/1',
                  borderRadius: 5,
                  bgcolor: theme.palette.background.default,
                  display: 'grid',
                  placeItems: 'center',
                  p: 3,
                  border: `1px solid ${theme.palette.primary.light}20`,
                }}
              >
                <Box
                  component="img"
                  src="/dait-logo.png"
                  alt="DAIT logo"
                  sx={{ maxWidth: '80%', maxHeight: '80%', borderRadius: 3 }}
                />
              </Box>
            </Box>

            <Box sx={{ textAlign: { xs: 'center', lg: 'left' } }}>
              <Typography
                variant="overline"
                sx={{ color: theme.palette.primary.light, letterSpacing: 2, fontWeight: 800 }}
              >
                CLINICAL AI DIAGNOSTICS
              </Typography>
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '2.6rem', md: '3.8rem' },
                  fontWeight: 900,
                  lineHeight: 1.05,
                  color: theme.palette.text.primary,
                  mt: 2,
                  mb: 3,
                }}
              >
                Detect{' '}
                <Box component="span" sx={{ color: theme.palette.primary.light }}>
                  DVT
                </Box>{' '}
                thrombus
                <br />
                in ultrasound
              </Typography>
              <Typography
                sx={{
                  color: theme.palette.text.secondary,
                  fontSize: { xs: '1rem', md: '1.15rem' },
                  maxWidth: 680,
                  mb: 5,
                  lineHeight: 1.8,
                }}
              >
                Upload ultrasound JPG/PNG images, run the AI model, collect radiologist feedback,
                and generate polished clinical reports instantly with DAIT.io.
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent={{ xs: 'center', sm: 'flex-start' }}
              >
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => nav('/login')}
                  sx={{
                    width: { xs: '100%', sm: 'auto' },
                    px: { xs: 6, sm: 8 },
                    py: 2.1,
                    fontSize: { xs: '1rem', md: '1.1rem' },
                    fontWeight: 700,
                    background: `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
                    color: theme.palette.primary.contrastText,
                    borderRadius: 3,
                    '&:hover': {
                      background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                      transform: 'translateY(-3px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Login
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => nav('/signup')}
                  sx={{
                    width: { xs: '100%', sm: 'auto' },
                    px: { xs: 6, sm: 8 },
                    py: 2.1,
                    fontSize: { xs: '1rem', md: '1.1rem' },
                    borderColor: theme.palette.secondary.main,
                    color: theme.palette.secondary.light,
                    borderRadius: 3,
                    '&:hover': {
                      borderColor: theme.palette.secondary.light,
                      color: theme.palette.secondary.light,
                      transform: 'translateY(-3px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Create account
                </Button>
              </Stack>

              <Typography
                variant="caption"
                sx={{ mt: 4, color: theme.palette.text.secondary, fontSize: '0.98rem', display: 'block' }}
              >
                Radiologist • Doctor • Sonographer
              </Typography>
            </Box>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}