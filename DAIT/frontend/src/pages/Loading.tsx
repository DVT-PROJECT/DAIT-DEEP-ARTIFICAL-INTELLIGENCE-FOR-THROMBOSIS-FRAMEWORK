import { Box, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'

import { API_BASE_URL } from '../lib/api'
import loaderBackground from '../assets/loader.png'
import { Splash } from './Splash'

const DEFAULT_LOADING_DURATION = 20_000
const HEALTH_CHECK_INTERVAL = 500
const PROGRESS_UPDATE_INTERVAL = 100

export function Loading() {
  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState(0)
  const [backendReady, setBackendReady] = useState(false)

  useEffect(() => {
    const startedAt = Date.now()
    let minimumDurationComplete = false
    let uvicornReady = false

    const finishWhenReady = () => {
      if (minimumDurationComplete && uvicornReady) {
        setProgress(100)
        setReady(true)
      }
    }

    const checkBackend = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`, { cache: 'no-store' })
        if (response.ok) {
          uvicornReady = true
          setBackendReady(true)
          finishWhenReady()
        }
      } catch {
        // Keep the loading screen visible until Uvicorn is reachable.
      }
    }

    void checkBackend()
    const minimumDurationTimer = window.setTimeout(() => {
      minimumDurationComplete = true
      finishWhenReady()
    }, DEFAULT_LOADING_DURATION)
    const healthTimer = window.setInterval(() => {
      void checkBackend()
    }, HEALTH_CHECK_INTERVAL)
    const progressTimer = window.setInterval(() => {
      setProgress(Math.min(Math.floor(((Date.now() - startedAt) / DEFAULT_LOADING_DURATION) * 95), 95))
    }, PROGRESS_UPDATE_INTERVAL)

    return () => {
      window.clearTimeout(minimumDurationTimer)
      window.clearInterval(healthTimer)
      window.clearInterval(progressTimer)
    }
  }, [])

  if (ready) return <Splash />

  return (
    <Box
      sx={{
        minHeight: '100svh',
        display: 'grid',
        placeItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        color: '#e0f2fe',
        backgroundColor: '#020b1a',
        backgroundImage: `linear-gradient(135deg, rgba(2, 11, 26, 0.16), rgba(3, 35, 65, 0.22)), url(${loaderBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(0, 190, 255, 0.18), transparent 46%)',
          pointerEvents: 'none',
        }}
      />
      <Stack
        spacing={1.2}
        sx={{
          position: 'absolute',
          zIndex: 1,
          left: { xs: '8%', sm: '7%' },
          bottom: { xs: '9%', sm: '8%' },
          width: { xs: '46%', sm: 250 },
          color: '#e0f2fe',
        }}
      >
        <Typography
          sx={{
            alignSelf: 'flex-end',
            color: '#00e5ff',
            fontSize: { xs: '1.7rem', sm: '2.1rem' },
            fontWeight: 500,
            lineHeight: 1,
          }}
        >
          {progress}%
        </Typography>
        <Box
          sx={{
            width: '100%',
            height: 8,
            display: 'flex',
            gap: '2px',
            overflow: 'hidden',
          }}
        >
          {Array.from({ length: 28 }, (_, index) => (
            <Box
              key={index}
              sx={{
                flex: 1,
                backgroundColor: index < Math.ceil(progress / 100 * 28)
                  ? '#00bfff'
                  : 'rgba(24, 44, 83, 0.9)',
                boxShadow: index < Math.ceil(progress / 100 * 28)
                  ? '0 0 5px rgba(0, 207, 255, 0.8)'
                  : 'none',
              }}
            />
          ))}
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(224, 242, 254, 0.78)',
            fontSize: { xs: '0.68rem', sm: '0.76rem' },
          }}
        >
          {backendReady ? 'Finalizing diagnostic workspace...' : 'Starting clinical AI services...'}
        </Typography>
      </Stack>
    </Box>
  )
}