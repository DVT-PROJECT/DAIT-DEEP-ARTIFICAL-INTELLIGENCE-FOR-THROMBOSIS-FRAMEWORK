import axios from 'axios'

// Vite dev: talk to API on :8000. Production / desktop app: same origin as the served SPA.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV
    ? 'http://localhost:8000'
    : typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:8000')

export const api = axios.create({
  baseURL: API_BASE_URL,
})

export function setAuthToken(token: string | null) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`
  else delete api.defaults.headers.common.Authorization
}

