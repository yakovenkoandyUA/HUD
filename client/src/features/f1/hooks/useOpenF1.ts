import { useState, useEffect, useRef, useCallback } from 'react'
import { authFetch } from '@/shared/services/api'

/**
 * useOpenF1
 * ---------
 * Polls `/api/f1/live/:endpoint` at the given interval.
 * Stops polling on unmount or when `enabled` is false.
 *
 * @param endpoint  — OpenF1 endpoint name (e.g. 'position', 'intervals')
 * @param params    — query params forwarded to OpenF1
 * @param interval  — polling interval in ms (default 5000)
 * @param enabled   — pause polling when false (default true)
 */
export function useOpenF1<T = unknown>(
  endpoint: string,
  params: Record<string, string | number> = {},
  interval = 5000,
  enabled = true,
): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData]       = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelledRef          = useRef(false)

  const buildUrl = useCallback(() => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
    ).toString()
    return `/api/f1/live/${endpoint}${qs ? `?${qs}` : ''}`
  }, [endpoint, JSON.stringify(params)])

  const poll = useCallback(async () => {
    if (cancelledRef.current) return
    try {
      const res = await authFetch(buildUrl())
      if (!res.ok) throw new Error(`${res.status}`)
      const json: T = await res.json()
      if (!cancelledRef.current) { setData(json); setError(null) }
    } catch (e) {
      if (!cancelledRef.current) setError(e instanceof Error ? e.message : 'error')
    } finally {
      if (!cancelledRef.current && enabled) {
        timerRef.current = setTimeout(poll, interval)
      }
    }
  }, [buildUrl, interval, enabled])

  useEffect(() => {
    if (!enabled) return
    cancelledRef.current = false
    setLoading(true)
    poll().finally(() => { if (!cancelledRef.current) setLoading(false) })
    return () => {
      cancelledRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, poll])

  return { data, loading, error }
}
