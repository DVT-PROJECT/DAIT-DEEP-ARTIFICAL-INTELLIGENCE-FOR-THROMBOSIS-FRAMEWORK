import { Backdrop, Box, CircularProgress, Typography } from '@mui/material'

export function FullScreenLoader({ open, label }: { open: boolean; label?: string }) {
  return (
    <Backdrop
      open={open}
      sx={{
        color: '#fff',
        zIndex: (t) => t.zIndex.modal + 1,
        backdropFilter: 'blur(6px)',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CircularProgress color="inherit" />
        <Typography sx={{ opacity: 0.9, fontWeight: 600 }}>
          {label ?? 'Processing…'}
        </Typography>
      </Box>
    </Backdrop>
  )
}

