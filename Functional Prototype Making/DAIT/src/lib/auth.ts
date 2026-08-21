export type Role = 'radiologist' | 'doctor' | 'sonographer'

export type AuthUser = {
  full_name: string
  email: string
  role: Role
}

export type AuthState = {
  token: string
  user: AuthUser
}

const KEY = 'dait_auth'

export function loadAuth(): AuthState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthState
  } catch {
    return null
  }
}

export function saveAuth(state: AuthState | null) {
  if (!state) localStorage.removeItem(KEY)
  else localStorage.setItem(KEY, JSON.stringify(state))
}

export function getAuthStorageKey() {
  return KEY
}

