const BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').trim()

/** True only when VITE_API_URL is set — use this before any API call */
export const isBackendConfigured = (): boolean => BASE_URL.length > 0

/** Read token from profileStore persist (no circular import) */
export const getToken = (): string | null => {
  try {
    const stored = localStorage.getItem('profile-storage')
    if (stored) {
      const parsed = JSON.parse(stored) as { state?: { token?: string } }
      return parsed?.state?.token ?? null
    }
  } catch { /* noop */ }
  return null
}

const RT_LS_KEY = 'hud-rt'
/** Fallback refresh token storage (cookie may not reach SW on cross-origin dev) */
export const getStoredRefreshToken = (): string | null => localStorage.getItem(RT_LS_KEY)
export const saveRefreshToken    = (rt: string)  => localStorage.setItem(RT_LS_KEY, rt)
export const clearRefreshToken   = ()            => localStorage.removeItem(RT_LS_KEY)

export function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

let refreshPromise: Promise<string | null> | null = null

async function tryRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    try {
      const storedRt = getStoredRefreshToken()
      const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: storedRt ? JSON.stringify({ refreshToken: storedRt }) : undefined,
      })
      if (!res.ok) {
        // Refresh token invalid/expired → force logout
        clearRefreshToken()
        const { useProfileStore } = await import('@/shared/store/profileStore')
        useProfileStore.getState().logout()
        return null
      }
      const { token, refreshToken: newRt } = await res.json() as { token: string; refreshToken?: string }
      if (newRt) saveRefreshToken(newRt)
      const { useProfileStore } = await import('@/shared/store/profileStore')
      useProfileStore.setState(s => ({ ...s, token }))
      return token
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if (!BASE_URL) throw new Error('VITE_API_URL is not configured')

  let token = getToken()

  // Proactively refresh if access token is about to expire (< 60s left)
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { exp: number }
      if (payload.exp * 1000 - Date.now() < 60_000) {
        token = await tryRefresh()
      }
    } catch { /* malformed token, proceed */ }
  }

  const makeRequest = (t: string | null) =>
    fetch(`${BASE_URL}${url}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(options.headers as Record<string, string> | undefined),
      },
    })

  const res = await makeRequest(token)

  // On 401: try refresh once, then retry
  if (res.status === 401 && token) {
    const newToken = await tryRefresh()
    if (newToken) return makeRequest(newToken)
  }

  return res
}
