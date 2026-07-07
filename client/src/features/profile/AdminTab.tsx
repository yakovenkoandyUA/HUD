import React, { useEffect, useState } from 'react'
import { authFetch } from '@/shared/services/api'
import styles from './ProfilePage.module.css'

interface AdminUser {
  id: string
  name: string
  username: string
  email: string | null
  role: 'admin' | 'user'
  avatarUrl: string | null
  createdAt: string
}

/**
 * AdminTab
 * --------
 * Вкладка "Адміністрування" — список усіх зареєстрованих користувачів.
 * Доступна тільки для role === 'admin'.
 */
const AdminTab: React.FC = () => {
  const [users, setUsers]     = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await authFetch('/api/auth/admin/users')
        if (!res.ok) throw new Error('Помилка завантаження')
        const data = await res.json() as AdminUser[]
        if (!cancelled) setUsers(data)
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Помилка')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className={styles.tabContent}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>КОРИСТУВАЧІ</span>
          {!loading && !error && (
            <span className={styles.sectionCount}>{users.length}</span>
          )}
        </div>

        {loading && <p className={styles.adminEmpty}>Завантаження...</p>}
        {error   && <p className={styles.adminEmpty}>{error}</p>}

        {!loading && !error && users.length === 0 && (
          <p className={styles.adminEmpty}>Немає користувачів</p>
        )}

        {!loading && !error && users.length > 0 && (
          <div className={styles.adminList}>
            {users.map(u => (
              <div key={u.id} className={styles.adminUserRow}>
                {u.avatarUrl ? (
                  <img
                    src={u.avatarUrl}
                    alt={u.name}
                    className={styles.adminAvatar}
                    width={40}
                    height={40}
                  />
                ) : (
                  <div className={styles.adminAvatarInitial}>
                    {(u.name || u.username || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className={styles.adminUserInfo}>
                  <div className={styles.adminUserTop}>
                    <span className={styles.adminUserName}>{u.name || u.username}</span>
                    {u.role === 'admin' && (
                      <span className={styles.adminBadge}>admin</span>
                    )}
                  </div>
                  <span className={styles.adminUserSub}>
                    @{u.username}{u.email ? ` · ${u.email}` : ''}
                  </span>
                  <span className={styles.adminUserDate}>{formatDate(u.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminTab
