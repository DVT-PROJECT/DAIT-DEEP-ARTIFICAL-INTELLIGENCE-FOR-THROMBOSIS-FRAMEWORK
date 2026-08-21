import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import ThumbUpAltRoundedIcon from '@mui/icons-material/ThumbUpAltRounded'
import ThumbDownAltRoundedIcon from '@mui/icons-material/ThumbDownAltRounded'
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import PrintRoundedIcon from '@mui/icons-material/PrintRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import ImageSearchRoundedIcon from '@mui/icons-material/ImageSearchRounded'
import { useNavigate, useParams } from 'react-router-dom'

import { AppLayout } from '../components/AppLayout'
import { FullScreenLoader } from '../components/FullScreenLoader'
import { BoxOverlay } from '../components/BoxOverlay'
import { api } from '../lib/api'
import './StudyResults.css'

type BoxItem = { x1: number; y1: number; x2: number; y2: number; score: number }
type ImageRow = {
  image_id: number
  filename: string
  label: string
  score: number
  width?: number | null
  height?: number | null
  boxes: BoxItem[]
  feedback: number | null
}

type Study = {
  study_id: number
  patient_id: number
  created_at: string
  images: ImageRow[]
}

function useImageDims() {
  const ref = useRef<HTMLImageElement | null>(null)
  const [dims, setDims] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setDims({ width: el.clientWidth, height: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, dims }
}

export function StudyResults() {
  const { id } = useParams()
  const studyId = Number(id)
  const nav = useNavigate()

  const [study, setStudy] = useState<Study | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [imgUrls, setImgUrls] = useState<Record<number, string>>({})

  async function load() {
    setErr(null)
    setBusy(true)
    try {
      const { data } = await api.get(`/studies/${studyId}`)
      setStudy(data as Study)
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? 'Failed to load study')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!Number.isFinite(studyId) || !studyId) return
    load().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyId])

  useEffect(() => {
    let cancelled = false
    async function fetchImages() {
      if (!study?.images?.length) return
      const next: Record<number, string> = {}
      for (const img of study.images) {
        try {
          const res = await api.get(`/study-images/${img.image_id}/file`, { responseType: 'blob' })
          const url = window.URL.createObjectURL(res.data)
          next[img.image_id] = url
        } catch {
          // ignore; card will show placeholder
        }
      }
      if (!cancelled) {
        // cleanup old urls
        setImgUrls((prev) => {
          Object.values(prev).forEach((u) => window.URL.revokeObjectURL(u))
          return next
        })
      } else {
        Object.values(next).forEach((u) => window.URL.revokeObjectURL(u))
      }
    }
    fetchImages().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [study])

  const summary = useMemo(() => {
    if (!study) return null
    const thrombus = study.images.filter((x) => x.label === 'thrombus').length
    const non = study.images.length - thrombus
    const avg = study.images.length
      ? study.images.reduce((a, b) => a + (b.score ?? 0), 0) / study.images.length
      : 0
    return { thrombus, non, avg }
  }, [study])

  async function setFeedback(imageId: number, feedback: 0 | 1) {
    setErr(null)
    try {
      await api.post('/feedback', { image_id: imageId, feedback })
      setStudy((prev) =>
        prev
          ? {
              ...prev,
              images: prev.images.map((r) => (r.image_id === imageId ? { ...r, feedback } : r)),
            }
          : prev,
      )
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? 'Failed to save feedback')
    }
  }

  async function downloadReport() {
    setErr(null)
    try {
      const res = await api.get(`/studies/${studyId}/report.pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `dait-study-${studyId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? 'Failed to download report')
    }
  }

  function printResults() {
    window.print()
  }

  return (
    <AppLayout title="Study Results">
      <FullScreenLoader open={busy} label="Loading study…" />

      <Stack spacing={2.5} className="study-results-page">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => nav('/app')}
          >
            Back to dashboard
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="outlined"
            startIcon={<PrintRoundedIcon />}
            onClick={printResults}
          >
            Print
          </Button>
          <Button
            variant="contained"
            startIcon={<PictureAsPdfRoundedIcon />}
            onClick={downloadReport}
            disabled={!studyId}
          >
            Download report (PDF)
          </Button>
        </Stack>

        {err ? <Alert severity="error">{err}</Alert> : null}

        {study && summary ? (
          <Paper className="results-overview" sx={{ p: { xs: 2, md: 2.5 } }} elevation={0}>
            <Stack spacing={0.5} sx={{ mb: 2 }}>
              <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: 1.6 }}>
                AI ANALYSIS COMPLETE
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                Study #{study.study_id} <span className="muted-divider">/</span> Patient #{study.patient_id}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review detections, provide model feedback, and save the clinical result.
              </Typography>
            </Stack>
            <Stack
              className="results-summary-grid"
            >
              <SummaryMetric label="Thrombus detected" value={summary.thrombus} tone="alert" />
              <SummaryMetric label="Clear scans" value={summary.non} tone="calm" />
              <SummaryMetric label="Average confidence" value={`${(summary.avg * 100).toFixed(1)}%`} tone="focus" />
            </Stack>
          </Paper>
        ) : null}

        <Stack spacing={2}>
          {(study?.images ?? []).map((r) => (
            <StudyImageCard
              key={r.image_id}
              row={r}
              src={imgUrls[r.image_id] ?? null}
              onFeedback={setFeedback}
            />
          ))}
        </Stack>
      </Stack>
    </AppLayout>
  )
}

function SummaryMetric({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <Box className={`summary-metric summary-metric-${tone}`}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h4" sx={{ fontWeight: 900 }}>{value}</Typography>
    </Box>
  )
}

function StudyImageCard({
  row,
  src,
  onFeedback,
}: {
  row: ImageRow
  src: string | null
  onFeedback: (imageId: number, feedback: 0 | 1) => void
}) {
  const { ref, dims } = useImageDims()
  const [selectedFeedback, setSelectedFeedback] = useState<0 | 1 | null>(row.feedback as 0 | 1 | null)
  const feedbackChanged = selectedFeedback !== row.feedback

  return (
    <Paper className="result-image-card" sx={{ p: { xs: 1.5, md: 2.2 } }} elevation={0}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
            <ImageSearchRoundedIcon color="primary" />
            <Typography sx={{ fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.filename}</Typography>
          </Stack>
          <Chip
            color={row.label === 'thrombus' ? 'primary' : 'default'}
            label={`${row.label} • ${row.score.toFixed(3)}`}
          />
          <Chip
            variant="outlined"
            label={row.boxes?.length ? `Boxes: ${row.boxes.length}` : 'Boxes: —'}
          />
        </Stack>

        <Box
          sx={{
            position: 'relative',
            borderRadius: 2.5,
            overflow: 'hidden',
            border: '1px solid rgba(11,79,108,0.10)',
            bgcolor: 'rgba(11,79,108,0.02)',
          }}
        >
          <Box
            component="img"
            ref={ref}
            alt={row.filename}
            src={src ?? '/dait-splash.png'}
            sx={{
              width: '100%',
              height: 320,
              objectFit: 'contain',
              display: 'block',
            }}
          />
          <BoxOverlay boxes={row.boxes ?? []} width={dims.width} height={dims.height} />
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
            Is this detection correct?
          </Typography>
          <Button
            size="small"
            variant={selectedFeedback === 1 ? 'contained' : 'outlined'}
            color="success"
            startIcon={<ThumbUpAltRoundedIcon />}
            onClick={() => setSelectedFeedback(1)}
          >
            Correct
          </Button>
          <Button
            size="small"
            variant={selectedFeedback === 0 ? 'contained' : 'outlined'}
            color="warning"
            startIcon={<ThumbDownAltRoundedIcon />}
            onClick={() => setSelectedFeedback(0)}
          >
            Needs review
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<SaveRoundedIcon />}
            disabled={!feedbackChanged}
            onClick={() => selectedFeedback !== null && onFeedback(row.image_id, selectedFeedback)}
          >
            Save feedback
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ ml: { sm: 'auto' } }}>
            {row.feedback == null ? 'Not saved' : 'Saved'}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  )
}

