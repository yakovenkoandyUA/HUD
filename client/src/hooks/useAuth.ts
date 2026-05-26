/**
 * useAuth
 * -------
 * Legacy hook — збережений для зворотної сумісності.
 * Нова система авторизації: useProfileStore (profile-select flow).
 */
import { useProfileStore } from '../store/profileStore'

export function useAuth() {
  const { token, logout } = useProfileStore()

  return {
    isAuthenticated: !!token,
    logout,
  }
}
