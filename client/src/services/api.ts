const BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').trim()
const TOKEN_KEY = 'hud_token'

/** True only when VITE_API_URL is set — use this before any API call */
export const isBackendConfigured = (): boolean => BASE_URL.length > 0

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token)
export const removeToken = (): void => localStorage.removeItem(TOKEN_KEY)

export function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if (!BASE_URL) throw new Error('VITE_API_URL is not configured')
  const token = getToken()
  return fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  })
}
