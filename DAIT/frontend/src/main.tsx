import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles.css'
import App from './App.tsx'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { theme } from './theme'
import { BrowserRouter } from 'react-router-dom'

import { DesktopHeartbeat } from './components/DesktopHeartbeat'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <DesktopHeartbeat />
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
