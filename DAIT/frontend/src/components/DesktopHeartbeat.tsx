import { useEffect } from 'react'

import { api } from '../lib/api'

/**
 * Keeps the packaged desktop server alive while any browser tab is open.
 * When all tabs/devices stop sending pings, the server exits (see backend idle_shutdown).
 */
export function DesktopHeartbeat() {
  useEffect(() => {
    let interval: number | undefined
    let cancelled = false

    ;(async () => {
      try {
        const { data } = await api.get<{
          ping_token: string | null
          ping_interval_ms?: number
        }>('/api/runtime')
        if (cancelled || !data.ping_token) return

        const ms = data.ping_interval_ms ?? 20_000
        const ping = () => {
          api
            .post('/internal/ping', {}, { headers: { 'X-DAIT-Session': data.ping_token! } })
            .catch(() => {})
        }
        ping()
        interval = window.setInterval(ping, ms)
      } catch {
        // Dev: backend without DAIT_SHUTDOWN_TOKEN — nothing to do.
      }
    })()

    return () => {
      cancelled = true
      if (interval) window.clearInterval(interval)
    }
  }, [])

  return null
}
