import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import ThumbUpAltRoundedIcon from '@mui/icons-material/ThumbUpAltRounded';
import ThumbDownAltRoundedIcon from '@mui/icons-material/ThumbDownAltRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';

import { AppLayout } from '../components/AppLayout';
import { FullScreenLoader } from '../components/FullScreenLoader';
import { saveAuth } from '../lib/auth';
import type { AuthState } from '../lib/auth';
import { useNavigate } from 'react-router-dom';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './Dashboard.css';

type Metrics = {
  total_predictions: number;
  thrombus: number;
  non_thrombus: number;
  thumb_up: number;
  thumb_down: number;
  precision_from_feedback: number | null;
};

type TimelinePoint = {
  day: string;
  total: number;
  thrombus: number;
  non_thrombus: number;
  thumb_up?: number;
  thumb_down?: number;
  precision?: number | null;
};


type HistoryRow = {
  patient_id: number;
  full_name: string;
  age: number;
  dvt_year: number | null;
  visit_date: string;
  studies: number;
  predictions: number;
  last_study_at: string | null;
  last_study_id?: number | null;
};

type ImageResult = {
  image_id: number;
  filename: string;
  label: string;
  score: number;
  boxes: Array<{ x1: number; y1: number; x2: number; y2: number; score: number }>;
  feedback: number | null;
};

export function Dashboard({ auth, onLogout }: { auth: AuthState; onLogout: () => void }) {
  const nav = useNavigate();
  const [tab, setTab] = useState(0);

  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState<number | ''>('');
  const [dvtYear, setDvtYear] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [patientId, setPatientId] = useState<number | null>(null);
  const [studyId, setStudyId] = useState<number | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [results, setResults] = useState<ImageResult[]>([]);

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingFeedback, setPendingFeedback] = useState<Record<number, 0 | 1 | null>>({});
  
  const canCreatePatient = useMemo(() => {
    return patientName.trim().length >= 2 && typeof patientAge === 'number' && patientAge > 0;
  }, [patientName, patientAge]);

  const canPredict = useMemo(() => !!patientId && files.length > 0, [patientId, files]);

  useEffect(() => {
    setMetrics({ total_predictions: 0, thrombus: 0, non_thrombus: 0, thumb_up: 0, thumb_down: 0, precision_from_feedback: null });
    setTimeline([]);
  }, []);

  // Preview URLs cleanup
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setFilePreviews((prev) => {
      prev.forEach((u) => URL.revokeObjectURL(u));
      return urls;
    });
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  // Handle Age (prevent negative)
  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') setPatientAge('');
    else {
      const num = Number(val);
      setPatientAge(num >= 0 ? num : 0);
    }
  };

  // Handle DVT Year (prevent negative)
  const handleDvtYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') setDvtYear('');
    else {
      const num = Number(val);
      setDvtYear(num >= 0 ? num : 0);
    }
  };

  async function createPatient() {
    if (!canCreatePatient) return;
    setErr(null);
    setBusy(true);
    try {
      const localPatientId = Date.now();
      setPatientId(localPatientId);
      setHistoryRows((prev) => [{
        patient_id: localPatientId,
        full_name: patientName.trim(),
        age: Number(patientAge),
        dvt_year: typeof dvtYear === 'number' && dvtYear > 0 ? dvtYear : null,
        visit_date: new Date().toISOString(),
        studies: 0,
        predictions: 0,
        last_study_at: null,
        last_study_id: null,
      }, ...prev]);
    } catch {
      setErr('Failed to create local patient');
    } finally {
      setBusy(false);
    }
  }

  async function runPrediction() {
    if (!patientId) return;
    setErr(null);
    setBusy(true);
    try {
      const localStudyId = Date.now();
      const localResults = files.map((file, index) => ({
        image_id: localStudyId + index,
        filename: file.name,
        label: 'non_thrombus',
        score: 0,
        boxes: [],
        feedback: null,
      }));
      setStudyId(localStudyId);
      setResults(localResults);
      setMetrics((prev) => prev ? { ...prev, total_predictions: prev.total_predictions + localResults.length, non_thrombus: prev.non_thrombus + localResults.length } : prev);
      setHistoryRows((prev) => prev.map((row) => row.patient_id === patientId ? { ...row, studies: row.studies + 1, predictions: row.predictions + localResults.length, last_study_at: new Date().toISOString(), last_study_id: localStudyId } : row));
      nav(`/study/${localStudyId}`, { state: { study: { study_id: localStudyId, patient_id: patientId, created_at: new Date().toISOString(), images: localResults }, imgUrls: Object.fromEntries(files.map((_, index) => [localStudyId + index, filePreviews[index]])) } });
    } catch {
      setErr('Prediction failed');
    } finally {
      setBusy(false);
    }
  }

  async function setFeedback(imageId: number, feedback: 0 | 1): Promise<boolean> {
    setErr(null);
    try {
      setResults((prev) =>
        prev.map((r) => (r.image_id === imageId ? { ...r, feedback } : r))
      );
      setMetrics((prev) => prev ? { ...prev, thumb_up: prev.thumb_up + (feedback === 1 ? 1 : 0), thumb_down: prev.thumb_down + (feedback === 0 ? 1 : 0) } : prev);
      return true;
    } catch {
      setErr('Failed to save feedback');
      return false;
    }
  }

  async function saveFeedback(imageId: number) {
    const feedback = pendingFeedback[imageId];
    if (feedback === undefined || feedback === null) return;
    const saved = await setFeedback(imageId, feedback);
    if (!saved) return;
    setPendingFeedback((prev) => ({ ...prev, [imageId]: null }));
    await tuneModelAutomatically();
  }

  async function tuneModelAutomatically() {
    return;
  }

  async function downloadReport() {
    if (!studyId) return;
    setErr(null);
    try {
      const url = window.URL.createObjectURL(new Blob(['Local DAIT study report'], { type: 'text/plain' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `dait-study-${studyId}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setErr('Failed to download local report');
    }
  }

  async function removePatient(patientIdToRemove: number) {
    if (!window.confirm('Remove this patient? All studies, images and reports will be deleted.')) return;
    setErr(null);
    setBusy(true);
    try {
      setHistoryRows((prev) => prev.filter((row) => row.patient_id !== patientIdToRemove));
    } catch {
      setErr('Failed to remove local patient');
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    saveAuth(null);
    onLogout();
  }

  const chartData = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: 'Thrombus', value: metrics.thrombus, color: '#fb7185' },
      { name: 'Clear scans', value: metrics.non_thrombus, color: '#67e8f9' },
      { name: 'Thumb up', value: metrics.thumb_up, color: '#22c55e' },
      { name: 'Thumb down', value: metrics.thumb_down, color: '#fbbf24' },
    ];
  }, [metrics]);

  return (
    <AppLayout title="DAIT Dashboard" onLogout={logout}>
      <FullScreenLoader open={busy} label="Processing..." />

      <Stack spacing={3} className="dashboard-root">
        <Box className="dashboard-hero">
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#e0f2fe' }}>
            Hello, {auth.user.full_name}
          </Typography>
          <Typography color="text.secondary">
            Role: <strong>{auth.user.role}</strong> • Clinical AI Diagnostics
          </Typography>
        </Box>

        {err && <Alert severity="error">{err}</Alert>}

        {/* Tabs */}
        <Paper className="dashboard-tabs dashboard-surface" sx={{ p: 1 }} elevation={0}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="standard"
            TabIndicatorProps={{ sx: { transition: 'none' } }}
            sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}
          >
            <Tab value={0} label="Scan" disableRipple />
            <Tab value={1} label="Analytics" disableRipple />
            <Tab value={2} label="History" disableRipple />
          </Tabs>
        </Paper>

        {/* ===================== SCAN TAB ===================== */}
        {tab === 0 && (
          <>
            <Grid container spacing={3}>
              {/* Patient Details */}
              <Grid item xs={12} md={7}>
                <Paper className="dashboard-surface" sx={{ p: 3 }} elevation={0}>
                  <Typography className="dashboard-section-title" variant="h6" gutterBottom>
                    Patient Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Patient Name"
                        fullWidth
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        disabled={!!patientId}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        label="Age"
                        fullWidth
                        type="number"
                        inputProps={{ min: 0 }}
                        value={patientAge}
                        onChange={handleAgeChange}
                        disabled={!!patientId}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        label="DVT Year"
                        fullWidth
                        type="number"
                        inputProps={{ min: 0 }}
                        value={dvtYear}
                        onChange={handleDvtYearChange}
                        disabled={!!patientId}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Notes (optional)"
                        fullWidth
                        multiline
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={!!patientId}
                      />
                    </Grid>
                  </Grid>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
                    <Button
                      className="dashboard-action-btn"
                      variant="contained"
                      size="large"
                      onClick={createPatient}
                      disabled={!canCreatePatient || !!patientId || busy}
                    >
                      {patientId ? `Patient Created (ID: ${patientId})` : 'Create Patient'}
                    </Button>
                    {patientId && (
                      <Button
                        className="dashboard-action-btn"
                        variant="outlined"
                        onClick={() => {
                          setPatientId(null);
                          setStudyId(null);
                          setResults([]);
                          setFiles([]);
                          setPatientName('');
                          setPatientAge('');
                          setDvtYear('');
                          setNotes('');
                        }}
                      >
                        New Patient
                      </Button>
                    )}
                  </Stack>
                </Paper>
              </Grid>

              {/* Stats */}
              <Grid item xs={12} md={5}>
                <Paper className="dashboard-surface" sx={{ p: 3 }} elevation={0}>
                  <Typography className="dashboard-section-title" variant="h6" gutterBottom>
                    Precision & Stats
                  </Typography>
                  {metrics ? (
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                      <Chip label={`Total: ${metrics.total_predictions}`} />
                      <Chip color="primary" label={`Thrombus: ${metrics.thrombus}`} />
                      <Chip label={`Non-Thrombus: ${metrics.non_thrombus}`} />
                      <Chip color="success" label={`👍 ${metrics.thumb_up}`} />
                      <Chip color="warning" label={`👎 ${metrics.thumb_down}`} />
                      <Chip color="secondary" label={`Precision: ${metrics.precision_from_feedback?.toFixed(3) ?? '—'}`} />
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">Loading metrics...</Typography>
                  )}

                  <Box sx={{ height: 240, mt: 3 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#67e8f9" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            {/* Upload Section */}
            <Paper className="dashboard-surface" sx={{ p: 3 }} elevation={0}>
              <Typography className="dashboard-section-title" variant="h6" gutterBottom>
                Upload Images & Run Scan
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
                <Button
                  className="dashboard-action-btn"
                  component="label"
                  variant="outlined"
                  startIcon={<UploadFileRoundedIcon />}
                  disabled={!patientId || busy}
                >
                  Select Images (JPG/PNG)
                  <input
                    hidden
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                  />
                </Button>

                <Typography color="text.secondary" sx={{ flex: 1 }}>
                  {files.length ? `${files.length} file(s) selected` : 'No files selected'}
                </Typography>

                <Button className="dashboard-action-btn" variant="contained" size="large" onClick={runPrediction} disabled={!canPredict || busy}>
                  SCAN
                </Button>

                <Button className="dashboard-action-btn" variant="outlined" startIcon={<PictureAsPdfRoundedIcon />} onClick={downloadReport} disabled={!studyId}>
                  Report PDF
                </Button>

                <Button className="dashboard-action-btn" variant="outlined" startIcon={<OpenInNewRoundedIcon />} onClick={() => studyId && nav(`/study/${studyId}`)} disabled={!studyId}>
                  Open Results
                </Button>
              </Stack>
            </Paper>

            {/* Image Previews */}
            {filePreviews.length > 0 && (
              <Paper className="dashboard-surface" sx={{ p: 3 }} elevation={0}>
                <Typography className="dashboard-section-title" variant="h6" gutterBottom>
                  Selected Images
                </Typography>
                <Grid container spacing={2}>
                  {filePreviews.map((src, idx) => (
                    <Grid item xs={12} sm={6} md={4} key={src}>
                      <Paper className="dashboard-preview-card dashboard-surface" sx={{ p: 1.5 }} elevation={0}>
                        <Box
                          component="img"
                          src={src}
                          alt={files[idx]?.name}
                          sx={{ width: '100%', height: 210, objectFit: 'contain', borderRadius: 2, bgcolor: '#0f1f38' }}
                        />
                        <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }} noWrap>
                          {files[idx]?.name}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}

            {/* Results */}
            {results.length > 0 && (
              <Paper className="dashboard-surface" sx={{ p: 3 }} elevation={0}>
                <Typography className="dashboard-section-title" variant="h6" gutterBottom>
                  Scan Results
                </Typography>
                <Grid container spacing={2}>
                  {results.map((r) => (
                    <Grid item xs={12} md={6} key={r.image_id}>
                      <Paper className="dashboard-results-card dashboard-surface" sx={{ p: 2.5 }} elevation={0}>
                        <Stack spacing={2}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography fontWeight={700}>{r.filename}</Typography>
                            <Chip color={r.label === 'thrombus' ? 'primary' : 'default'} label={`${r.label} • ${r.score.toFixed(3)}`} />
                          </Stack>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
                              Review prediction
                            </Typography>
                            <Button size="small" variant={pendingFeedback[r.image_id] === 1 ? 'contained' : 'outlined'} color="success" startIcon={<ThumbUpAltRoundedIcon />} onClick={() => setPendingFeedback((prev) => ({ ...prev, [r.image_id]: 1 }))}>
                              Correct
                            </Button>
                            <Button size="small" variant={pendingFeedback[r.image_id] === 0 ? 'contained' : 'outlined'} color="warning" startIcon={<ThumbDownAltRoundedIcon />} onClick={() => setPendingFeedback((prev) => ({ ...prev, [r.image_id]: 0 }))}>
                              Needs review
                            </Button>
                            <Button size="small" variant="contained" startIcon={<SaveRoundedIcon />} disabled={pendingFeedback[r.image_id] == null} onClick={() => saveFeedback(r.image_id)}>
                              Save feedback
                            </Button>
                            <Typography variant="caption" color="text.secondary" sx={{ ml: { sm: 'auto' } }}>
                              {r.feedback == null ? 'Not saved' : 'Saved'}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}
          </>
        )}

        {/* ===================== ANALYTICS TAB ===================== */}
        {tab === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Paper className="dashboard-surface analytics-panel" sx={{ p: 3 }} elevation={0}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <TrendingUpRoundedIcon color="primary" />
                  <Typography variant="h6" fontWeight={800}>Prediction activity</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Daily scan volume and thrombus detections across your clinical workspace.
                </Typography>
                <Box sx={{ height: 320 }}>
                  <ResponsiveContainer>
                    <AreaChart data={timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ background: '#071827', border: '1px solid rgba(103,232,249,.3)', borderRadius: 10 }} />
                      <Area type="monotone" dataKey="total" name="All scans" stroke="#67e8f9" fill="url(#totalFill)" strokeWidth={3} />
                      <Area type="monotone" dataKey="thrombus" name="Thrombus" stroke="#fb7185" fill="url(#thrombusFill)" strokeWidth={2} />
                      <defs>
                        <linearGradient id="totalFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#67e8f9" stopOpacity={0.32} /><stop offset="100%" stopColor="#67e8f9" stopOpacity={0} /></linearGradient>
                        <linearGradient id="thrombusFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb7185" stopOpacity={0.22} /><stop offset="100%" stopColor="#fb7185" stopOpacity={0} /></linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={5}>
              <Paper className="dashboard-surface analytics-panel" sx={{ p: 3 }} elevation={0}>
                <Typography variant="h6" fontWeight={800}>Signal breakdown</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Model outcomes and radiologist feedback.</Typography>
                <Box sx={{ height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#94a3b8" allowDecimals={false} />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" width={82} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#071827', border: '1px solid rgba(103,232,249,.3)', borderRadius: 10 }} />
                      <Bar dataKey="value" name="Count" radius={[0, 6, 6, 0]}>
                        {chartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
                <Stack spacing={1.2} sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">Feedback precision</Typography>
                  <LinearProgress variant="determinate" value={(metrics?.precision_from_feedback ?? 0) * 100} sx={{ height: 8, borderRadius: 4, '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg,#00e6d2,#67e8f9)' } }} />
                  <Typography variant="body2" fontWeight={700}>{metrics?.precision_from_feedback != null ? `${(metrics.precision_from_feedback * 100).toFixed(1)}% confirmed precision` : 'Awaiting feedback'}</Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* ===================== HISTORY TAB ===================== */}
        {tab === 2 && (
          <Paper className="dashboard-surface" sx={{ p: 3 }} elevation={0}>
            <Typography className="dashboard-section-title" variant="h6" gutterBottom>
              Patient History
            </Typography>
            <Table size="small" className="dashboard-history-table">
              <TableHead>
                <TableRow>
                  <TableCell>Patient</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell>DVT Year</TableCell>
                  <TableCell>Studies</TableCell>
                  <TableCell>Predictions</TableCell>
                  <TableCell>Last Visit</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyRows.map((r) => (
                  <TableRow key={r.patient_id}>
                    <TableCell>{r.full_name}</TableCell>
                    <TableCell>{r.age}</TableCell>
                    <TableCell>{r.dvt_year ?? '-'}</TableCell>
                    <TableCell>{r.studies}</TableCell>
                    <TableCell>{r.predictions}</TableCell>
                    <TableCell>{new Date(r.visit_date).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          color="primary"
                          disabled={!r.last_study_id}
                          onClick={downloadReport}
                        >
                          <PictureAsPdfRoundedIcon />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => removePatient(r.patient_id)}>
                          <DeleteForeverRoundedIcon />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Stack>
    </AppLayout>
  );
}
