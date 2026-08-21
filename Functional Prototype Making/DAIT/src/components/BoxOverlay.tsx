import { Box } from '@mui/material'

type BoxItem = { x1: number; y1: number; x2: number; y2: number; score: number }

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
}

function isLikelyNormalized(b: BoxItem) {
  return (
    b.x1 >= 0 &&
    b.y1 >= 0 &&
    b.x2 <= 1.5 &&
    b.y2 <= 1.5 &&
    b.x2 >= b.x1 &&
    b.y2 >= b.y1
  )
}

export function BoxOverlay({
  boxes,
  width,
  height,
}: {
  boxes: BoxItem[]
  width: number
  height: number
}) {
  if (!boxes?.length) return null

  return (
    <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {boxes.map((b, idx) => {
        const normalized = isLikelyNormalized(b)
        const x1 = normalized ? clamp01(b.x1) * width : b.x1
        const y1 = normalized ? clamp01(b.y1) * height : b.y1
        const x2 = normalized ? clamp01(b.x2) * width : b.x2
        const y2 = normalized ? clamp01(b.y2) * height : b.y2

        const left = Math.max(0, Math.min(width, x1))
        const top = Math.max(0, Math.min(height, y1))
        const w = Math.max(0, Math.min(width - left, x2 - x1))
        const h = Math.max(0, Math.min(height - top, y2 - y1))

        return (
          <Box
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            sx={{
              position: 'absolute',
              left,
              top,
              width: w,
              height: h,
              borderRadius: 1.5,
              border: '2px solid rgba(239,71,111,0.95)',
              boxShadow: '0 0 0 3px rgba(239,71,111,0.15)',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: -22,
                px: 1,
                py: 0.2,
                borderRadius: 1,
                fontSize: 12,
                fontWeight: 800,
                color: '#fff',
                bgcolor: 'rgba(239,71,111,0.95)',
              }}
            >
              {(b.score ?? 0).toFixed(2)}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

