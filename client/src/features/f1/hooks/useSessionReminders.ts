import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '@/shared/services/api'
import { subscribeToPush } from '@/shared/utils/pushManager'

/**
 * useSessionReminders
 * --------------------
 * Push-нагадування за 30 хв до конкретної сесії ГП (FP/Sprint/Quali/Race).
 * Стан активних нагадувань для раунду + toggle з optimistic update.
 */
export function useSessionReminders(round: number) {
  const [active, setActive]   = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!cancelled) setLoading(true)
      try {
        const res = await authFetch(`/api/f1/reminders?round=${round}`)
        const keys: string[] = await res.json()
        if (!cancelled) setActive(new Set(keys))
      } catch {
        /* silent — reminders are a nice-to-have */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [round])

  const toggle = useCallback(async (sessionKey: string, sessionLabel: string, sessionAt: string) => {
    const wasActive = active.has(sessionKey)
    setActive(prev => {
      const next = new Set(prev)
      if (wasActive) next.delete(sessionKey); else next.add(sessionKey)
      return next
    })

    try {
      if (wasActive) {
        const res = await authFetch(`/api/f1/reminders/${round}/${sessionKey}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('delete failed')
      } else {
        await subscribeToPush()
        const res = await authFetch('/api/f1/reminders', {
          method: 'POST',
          body: JSON.stringify({ round, sessionKey, sessionLabel, sessionAt }),
        })
        if (!res.ok) throw new Error('create failed')
      }
    } catch {
      setActive(prev => {
        const next = new Set(prev)
        if (wasActive) next.add(sessionKey); else next.delete(sessionKey)
        return next
      })
    }
  }, [round, active])

  return { active, loading, toggle }
}
