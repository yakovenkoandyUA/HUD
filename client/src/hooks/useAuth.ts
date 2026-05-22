import { useState } from 'react'
import { getToken, setToken, removeToken, isTokenValid, isBackendConfigured, authFetch } from '../services/api'

function checkAuth(): boolean {
  const token = getToken()
  return !!token && isTokenValid(token)
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(checkAuth)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = async (password: string): Promise<boolean> => {
    if (!isBackendConfigured()) {
      setError('VITE_API_URL не налаштовано')
      return false
    }
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error || 'Невірний пароль')
        return false
      }
      const { token } = await res.json() as { token: string }
      setToken(token)
      setIsAuthenticated(true)
      return true
    } catch {
      setError("Помилка з'єднання з сервером")
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = (): void => {
    removeToken()
    setIsAuthenticated(false)
  }

  return { isAuthenticated, login, logout, loading, error }
}
