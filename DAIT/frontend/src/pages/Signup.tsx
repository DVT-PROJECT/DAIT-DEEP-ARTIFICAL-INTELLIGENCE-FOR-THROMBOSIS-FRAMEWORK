import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  InputAdornment,
  Link,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import { Link as RouterLink, useNavigate } from 'react-router-dom'

import { api, setAuthToken } from '../lib/api'
import { saveAuth } from '../lib/auth'
import type { Role } from '../lib/auth'
import { emitAuthChanged } from '../lib/authEvents'
import { FullScreenLoader } from '../components/FullScreenLoader'
import { getPasswordStrength } from '../lib/passwordStrength'
import './Auth.css'

export function Signup() {
  const nav = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [role, setRole] = useState<Role>('radiologist')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [generatedPin, setGeneratedPin] = useState('')

  const normalizedEmail = email.trim().toLowerCase()
  const fullEmail = `${normalizedEmail}@dait.com`
  const isEmailValid = useMemo(() => /^[a-z0-9._-]+$/.test(normalizedEmail) && normalizedEmail.length >= 2, [normalizedEmail])
  const passwordsMatch = useMemo(() => password === confirmPassword, [password, confirmPassword])
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])
  const canSubmit = useMemo(() => {
    return fullName.trim().length >= 2 && isEmailValid && password.length >= 6 && passwordsMatch
  }, [fullName, isEmailValid, password, passwordsMatch])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    
    setErr(null)
    setLoading(true)
    try {
      const { data } = await api.post('/auth/signup', {
        full_name: fullName.trim(),
        email: fullEmail,
        password,
        role,
      })
      setGeneratedPin(data.pin)
      setShowPin(true)
      // Auto-login after showing PIN
      setTimeout(() => {
        const state = {
          token: data.access_token as string,
          user: { full_name: data.full_name, email: data.email, role: data.role },
        }
        saveAuth(state)
        setAuthToken(state.token)
        emitAuthChanged()
        nav('/app', { replace: true })
      }, 5000)
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getEmailHelperText = () => {
    if (!emailTouched || !email) return 'Username will become username@dait.com'
    if (!isEmailValid && email.length < 2) return 'Username must be at least 2 characters'
    if (!isEmailValid) return 'Username can only contain letters, numbers, dots, hyphens and underscores'
    return 'Valid username'
  }

  return (
    <Box className="auth-page">
      <FullScreenLoader open={loading} label="Creating account..." />
      <Paper className="auth-card" elevation={0}>
        {showPin ? (
          <Stack spacing={2.5}>
            <Box>
              <Typography className="auth-title" variant="h4" sx={{ fontWeight: 900, color: 'success.main' }}>
                 Account Created!
              </Typography>
              <Typography className="auth-subtitle" color="text.secondary">
                Save your security PIN - you'll need it if you forget your password.
              </Typography>
            </Box>

            <Box className="pin-box">
              <Typography className="pin-label" component="div" mb={1}>
                Your Security PIN:
              </Typography>
              <Typography variant="h2" className="pin-code">
                {generatedPin}
              </Typography>
              <Typography variant="caption" className="pin-note">
                Screenshot or write this down in a safe place
              </Typography>
            </Box>

            <Alert severity="info">
              Redirecting to dashboard in 5 seconds... or click below to skip
            </Alert>

            <Button 
              variant="contained" 
              size="large" 
              onClick={() => nav('/app', { replace: true })}
            >
              Go to Dashboard
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2.5} component="form" onSubmit={onSubmit}>
          <Box>
            <Typography className="auth-title" variant="h4" sx={{ fontWeight: 900 }}>
              Create Account
            </Typography>
            <Typography className="auth-subtitle" color="text.secondary">
              Sign up for DAIT medical platform. All accounts use @dait.com email.
            </Typography>
          </Box>

          {err ? <Alert severity="error">{err}</Alert> : null}

          <TextField
            label="Full Name"
            placeholder=" your ID name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            fullWidth
            disabled={loading}
          />

          <TextField
            label="Email Username"
            placeholder="Enter username only"
            value={email}
            onChange={(e) => setEmail(e.target.value.toLowerCase())}
            onBlur={() => setEmailTouched(true)}
            autoComplete="off"
            fullWidth
            disabled={loading}
            error={emailTouched && email.length > 0 && !isEmailValid}
            helperText={getEmailHelperText()}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="body2" color="text.secondary">
                    @dait.com
                  </Typography>
                </InputAdornment>
              ),
            }}
          />
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1, mb: 1 }}>
            Your email will be: <strong>{fullEmail}</strong>
          </Typography>

          <TextField
            label="Password"
            placeholder="Enter strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
                    disabled={loading}
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

          <TextField
            label="Confirm Password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onBlur={() => setConfirmTouched(true)}
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            fullWidth
            disabled={loading}
            error={confirmTouched && confirmPassword.length > 0 && !passwordsMatch}
            helperText={confirmTouched && confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match' : ' '}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    disabled={loading}
                  >
                    {showConfirmPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <FormControl fullWidth disabled={loading}>
            <InputLabel id="role-label">Professional Role</InputLabel>
            <Select
              labelId="role-label"
              value={role}
              label="Professional Role"
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <MenuItem value="radiologist">Radiologist</MenuItem>
              <MenuItem value="doctor">Doctor</MenuItem>
              <MenuItem value="sonographer">Sonographer</MenuItem>
            </Select>
          </FormControl>

          <Button 
            type="submit" 
            variant="contained" 
            size="large" 
            disabled={!canSubmit || loading}
            sx={{
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Button>

          <Typography variant="body2" color="text.secondary">
            Already have an account? {' '}
            <Link component={RouterLink} to="/login" sx={{ fontWeight: 600 }}>
              Login here
            </Link>
          </Typography>

          <Link component={RouterLink} to="/" underline="hover">
            Back to home
          </Link>
          </Stack>
        )}
      </Paper>
    </Box>
  )
}
