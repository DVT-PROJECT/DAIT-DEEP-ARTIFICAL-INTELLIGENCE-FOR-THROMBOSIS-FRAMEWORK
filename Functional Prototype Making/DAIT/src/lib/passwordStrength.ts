export type PasswordStrength = {
  score: number
  label: 'Very weak' | 'Weak' | 'Medium' | 'Strong'
  progress: number
  color: 'error' | 'warning' | 'info' | 'success'
}

export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (score <= 1) return { score, label: 'Very weak', progress: 20, color: 'error' }
  if (score <= 3) return { score, label: 'Weak', progress: 40, color: 'warning' }
  if (score <= 4) return { score, label: 'Medium', progress: 70, color: 'info' }
  return { score, label: 'Strong', progress: 100, color: 'success' }
}

