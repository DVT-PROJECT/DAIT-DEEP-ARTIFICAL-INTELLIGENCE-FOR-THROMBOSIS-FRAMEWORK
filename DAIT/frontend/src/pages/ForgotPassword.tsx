import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  LinearProgress,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import { Link as RouterLink, useNavigate } from 'react-router-dom'

import { api } from '../lib/api'
import { FullScreenLoader } from '../components/FullScreenLoader'
import { getPasswordStrength } from '../lib/passwordStrength'
import './Auth.css'

export function ForgotPassword() {
  const nav = useNavigate()
  const [step, setStep] = useState<'email' | 'pin'>('email')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)

  const normalizedEmail = email.trim().toLowerCase()
  const isEmailFormatValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail),
    [normalizedEmail]
  )

  const passwordsMatch = useMemo(() => newPassword === confirmPassword, [newPassword, confirmPassword])
  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword])
  const isPinValid = useMemo(() => /^\d{4}$/.test(pin), [pin])

  const canSubmitEmail = useMemo(() => isEmailFormatValid, [isEmailFormatValid])
  const canSubmitPin = useMemo(
    () => isPinValid && newPassword.length >= 6 && passwordsMatch,
    [isPinValid, newPassword, passwordsMatch]
  )

  async function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmitEmail) return

    setErr(null)
    setSuccessMsg(null)
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', {
        email: normalizedEmail,
      })
      setSuccessMsg('Enter your 4-digit PIN from account creation')
      setStep('pin')
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? 'Failed to find account')
    } finally {
      setLoading(false)
    }
  }

  async function onSubmitPin(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmitPin) return

    setErr(null)
    setSuccessMsg(null)
    setLoading(true)
    try {
      await api.post('/auth/reset-password-with-pin', {
        email: normalizedEmail,
        pin: pin,
        new_password: newPassword,
      })
      setSuccessMsg('Password reset successfully! Redirecting to login...')
      setTimeout(() => {
        nav('/login', { replace: true })
      }, 2000)
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? 'Failed to reset password. Check PIN and try again.')
    } finally {
      setLoading(false)
    }
  }

  const emailHelperText =
    emailTouched && email.length > 0
      ? !isEmailFormatValid
        ? 'Enter a valid email address'
        : ' '
      : ' '

  return (
    <Box className="auth-page">
      <FullScreenLoader open={loading} label={step === 'email' ? 'Looking up account...' : 'Resetting password...'} />
      <Paper className="auth-card" elevation={0}>
        {step === 'email' ? (
          <Stack spacing={2.5} component="form" onSubmit={onSubmitEmail}>
            <Box>
              <Typography className="auth-title" variant="h4" sx={{ fontWeight: 900 }}>
                Reset Password
              </Typography>
              <Typography className="auth-subtitle" color="text.secondary">
                Enter your @dait.com email address to begin password reset.
              </Typography>
            </Box>

            {err ? <Alert severity="error">{err}</Alert> : null}
            {successMsg ? <Alert severity="success">{successMsg}</Alert> : null}

            <TextField
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              autoComplete="email"
              fullWidth
              error={emailTouched && email.length > 0 && !isEmailFormatValid}
              helperText={emailHelperText}
            />

            <Button type="submit" variant="contained" size="large" disabled={!canSubmitEmail || loading}>
              {loading ? 'Checking...' : 'Continue'}
            </Button>

            <Stack direction="row" spacing={1} justifyContent="space-between">
              <Link component={RouterLink} to="/login" underline="hover">
                Back to login
              </Link>
              <Link component={RouterLink} to="/signup" underline="hover">
                Create account
              </Link>
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={2.5} component="form" onSubmit={onSubmitPin}>
            <Box>
              <Typography className="auth-title" variant="h4" sx={{ fontWeight: 900 }}>
                Enter Security PIN
              </Typography>
              <Typography className="auth-subtitle" color="text.secondary">
                Enter your 4-digit PIN from account creation and set a new password.
              </Typography>
            </Box>

            {err ? <Alert severity="error">{err}</Alert> : null}
            {successMsg ? <Alert severity="success">{successMsg}</Alert> : null}

            <TextField
              label="4-Digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              fullWidth
              disabled={loading}
              error={pin.length > 0 && !isPinValid}
              helperText={pin.length > 0 && !isPinValid ? 'PIN must be 4 digits' : 'The PIN you received during signup'}
              inputProps={{ maxLength: 4, style: { fontSize: '2em', letterSpacing: '0.5em', textAlign: 'center' } }}
              type="tel"
            />

            <TextField
              label="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              fullWidth
              disabled={loading}
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

            {newPassword.length > 0 ? (
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

            <TextField
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              fullWidth
              disabled={loading}
              error={confirmPassword.length > 0 && !passwordsMatch}
              helperText={confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match' : ' '}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="large"
                onClick={() => {
                  setStep('email')
                  setErr(null)
                  setPin('')
                  setNewPassword('')
                  setConfirmPassword('')
                }}
                disabled={loading}
              >
                Back
              </Button>
              <Button type="submit" variant="contained" size="large" disabled={!canSubmitPin || loading} fullWidth>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>
    </Box>
  )
}
