import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'

import { getAuthStorageKey, loadAuth, saveAuth, type AuthState } from './lib/auth'
import { setAuthToken } from './lib/api'
import { AUTH_CHANGED_EVENT } from './lib/authEvents'
import { Loading } from './pages/Loading'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { ForgotPassword } from './pages/ForgotPassword'
import { Dashboard } from './pages/Dashboard'
import { StudyResults } from './pages/StudyResults'

function App() {
  const [auth, setAuth] = useState<AuthState | null>(() => loadAuth())

  useEffect(() => {
    if (auth?.token) setAuthToken(auth.token)
    else setAuthToken(null)
  }, [auth])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === getAuthStorageKey()) setAuth(loadAuth())
    }
    const onAuthChanged = () => setAuth(loadAuth())
    window.addEventListener('storage', onStorage)
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged)
    }
  }, [])

  const isAuthed = useMemo(() => !!auth?.token, [auth])

  return (
    <Routes>
      <Route path="/" element={<Loading />} />
      <Route path="/login" element={isAuthed ? <Navigate to="/app" replace /> : <Login />} />
      <Route path="/signup" element={isAuthed ? <Navigate to="/app" replace /> : <Signup />} />
      <Route path="/forgot-password" element={isAuthed ? <Navigate to="/app" replace /> : <ForgotPassword />} />
      <Route
        path="/app"
        element={
          isAuthed && auth ? (
            <Dashboard
              auth={auth}
              onLogout={() => {
                saveAuth(null)
                setAuth(null)
              }}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/study/:id"
        element={isAuthed ? <StudyResults /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
