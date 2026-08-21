import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Link,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import { Link as RouterLink, useNavigate } from 'react-router-dom'

import { api, setAuthToken } from '../lib/api'
import { saveAuth } from '../lib/auth'
import { emitAuthChanged } from '../lib/authEvents'
import { FullScreenLoader } from '../components/FullScreenLoader'
import { getPasswordStrength } from '../lib/passwordStrength'
import './Auth.css'

export function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)

  const normalizedEmail = email.trim().toLowerCase()
  const isEmailFormatValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail), [normalizedEmail])
  const isDaitEmail = useMemo(() => /^[^\s@]+@dait\.com$/.test(normalizedEmail), [normalizedEmail])
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])
  const canSubmit = useMemo(() => isDaitEmail && password.length >= 6, [isDaitEmail, password])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      const form = new FormData()
      form.append('email', normalizedEmail)
      form.append('password', password)
      const { data } = await api.post('/auth/login', form)
      const state = {
        token: data.access_token as string,
        user: { full_name: data.full_name, email: data.email, role: data.role },
      }
      saveAuth(state)
      setAuthToken(state.token)
      emitAuthChanged()
      nav('/app', { replace: true })
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const emailHelperText =
    emailTouched && email.length > 0
      ? !isEmailFormatValid
        ? 'Enter a valid email address.'
        : !isDaitEmail
          ? 'Only @dait.com emails are allowed.'
          : ' '
      : ' '

  return (
    <Box className="auth-page">
      <FullScreenLoader open={loading} label="Logging in…" />
      <Paper className="auth-card" elevation={0}>
        <Stack spacing={2.5} component="form" onSubmit={onSubmit}>
          <Box>
            <Typography className="auth-title" variant="h4" sx={{ fontWeight: 900 }}>
              Welcome back
            </Typography>
            <Typography className="auth-subtitle" color="text.secondary">
              Login to access your DAIT dashboard.
            </Typography>
          </Box>

          {err ? <Alert severity="error">{err}</Alert> : null}

          <TextField
            label="Email"
            placeholder="yourname@dait.com"     // ← Added proper placeholder
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            autoComplete="email"
            fullWidth
            error={emailTouched && email.length > 0 && (!isEmailFormatValid || !isDaitEmail)}
            helperText={emailHelperText}
          />

          <TextField
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {password.length > 0 ? (
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                Password strength: {passwordStrength.label}
              </Typography>
              <LinearProgress
                variant="determinate"
                color={passwordStrength.color}
                value={passwordStrength.progress}
              />
            </Stack>
          ) : null}

          <Button type="submit" variant="contained" size="large" disabled={!canSubmit || loading}>
            {loading ? 'Logging in…' : 'Login'}
          </Button>

          <Typography variant="body2" color="text.secondary">
            Don’t have an account?{' '}
            <Link component={RouterLink} to="/signup">
              Sign up
            </Link>
          </Typography>

          <Box sx={{ textAlign: 'center' }}>
            <Link component={RouterLink} to="/forgot-password" underline="hover">
              Forgot password?
            </Link>
          </Box>
        </Stack>
      </Paper>
    </Box>
  )
}