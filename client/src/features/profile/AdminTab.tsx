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
  plan: 'free' | 'personal' | 'couple' | 'family'
  subscriptionStatus: string
  planExpiresAt: string | null
  f1Enabled: boolean
  drinksEnabled: boolean
  familyIds: string[]
}

const PLAN_LABELS: Record<AdminUser['plan'], string> = {
  free:     'FREE',
  personal: 'PERSONAL',
  couple:   'DUO',
  family:   'GROUP',
}

const PLAN_OPTIONS: AdminUser['plan'][] = ['free', 'personal', 'couple', 'family']

interface AnalyticsData {
  totalUsers: number
  funnel: {
    onboarded:          { count: number; pct: number }
    createdFirstSpace:  { count: number; pct: number }
    createdFirstMemory: { count: number; pct: number }
  }
  active: { last7d: number; last30d: number }
}

/**
 * AnalyticsPanel
 * --------------
 * Launch-readiness funnel: реєстрації → onboarding → перший Space → перший Memory,
 * і активні за 7/30 днів. Дані виводяться з існуючих timestamp-полів
 * (User/Space/Memory.createdAt, User.lastLoginAt) — без окремого event-трекінгу.
 */
const AnalyticsPanel: React.FC = () => {
  const [data, setData]       = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await authFetch('/api/auth/admin/analytics')
        if (!res.ok) throw new Error()
        const json = await res.json() as AnalyticsData
        if (!cancelled) setData(json)
      } catch {
        // silent — panel just stays empty
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading || !data) return null

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>АНАЛІТИКА</span>
        <span className={styles.sectionCount}>{data.totalUsers} юзерів</span>
      </div>
      <div className={styles.analyticsGrid}>
        <div className={styles.analyticsTile}>
          <span className={styles.analyticsNum}>{data.funnel.onboarded.pct}%</span>
          <span className={styles.analyticsSub}>{data.funnel.onboarded.count}/{data.totalUsers}</span>
          <span className={styles.analyticsLabel}>Onboarding</span>
        </div>
        <div className={styles.analyticsTile}>
          <span className={styles.analyticsNum}>{data.funnel.createdFirstSpace.pct}%</span>
          <span className={styles.analyticsSub}>{data.funnel.createdFirstSpace.count}/{data.totalUsers}</span>
          <span className={styles.analyticsLabel}>Перший Space</span>
        </div>
        <div className={styles.analyticsTile}>
          <span className={styles.analyticsNum}>{data.funnel.createdFirstMemory.pct}%</span>
          <span className={styles.analyticsSub}>{data.funnel.createdFirstMemory.count}/{data.totalUsers}</span>
          <span className={styles.analyticsLabel}>Перший Memory</span>
        </div>
        <div className={styles.analyticsTile}>
          <span className={styles.analyticsNum}>{data.active.last7d}</span>
          <span className={styles.analyticsSub}>активні</span>
          <span className={styles.analyticsLabel}>За 7 днів</span>
        </div>
        <div className={styles.analyticsTile}>
          <span className={styles.analyticsNum}>{data.active.last30d}</span>
          <span className={styles.analyticsSub}>активні</span>
          <span className={styles.analyticsLabel}>За 30 днів</span>
        </div>
      </div>
    </section>
  )
}

/** BFS connected components — returns userId → groupId (only for users with family links) */
function buildFamilyGroups(users: AdminUser[]): Map<string, string> {
  const userIds = new Set(users.map(u => u.id))
  const adj = new Map<string, string[]>()
  for (const u of users) {
    adj.set(u.id, u.familyIds.filter(id => userIds.has(id)))
  }

  const visited = new Set<string>()
  const groupMap = new Map<string, string>()
  let idx = 0

  for (const u of users) {
    if (visited.has(u.id) || (adj.get(u.id)?.length ?? 0) === 0) continue
    const groupId = `g${idx++}`
    const queue = [u.id]
    while (queue.length) {
      const curr = queue.shift()!
      if (visited.has(curr)) continue
      visited.add(curr)
      groupMap.set(curr, groupId)
      for (const nb of adj.get(curr) ?? []) {
        if (!visited.has(nb)) queue.push(nb)
      }
    }
  }
  return groupMap
}

/**
 * AdminTab
 * --------
 * Адмін-панель: список юзерів з планом, сімейними групами,
 * ручною зміною підписки та видаленням акаунту.
 */
const AdminTab: React.FC = () => {
  const [users, setUsers]         = useState<AdminUser[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [savingPlan, setSavingPlan]   = useState<string | null>(null)
  const [savingMonths, setSavingMonths] = useState<string | null>(null)
  const [savingFlag, setSavingFlag]   = useState<string | null>(null)

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

  const handleSetPlan = async (userId: string, plan: AdminUser['plan']) => {
    let cancelled = false
    setSavingPlan(userId)
    try {
      const res = await authFetch(`/api/auth/admin/users/${userId}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, subscriptionStatus: plan === 'free' ? 'none' : 'active' }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json() as { plan: AdminUser['plan']; subscriptionStatus: string; planExpiresAt: string | null }
      if (!cancelled) {
        setUsers(prev => prev.map(u => u.id === userId
          ? { ...u, plan: data.plan, subscriptionStatus: data.subscriptionStatus, planExpiresAt: data.planExpiresAt }
          : u,
        ))
      }
    } catch {
      // silent — plan didn't change
    } finally {
      if (!cancelled) setSavingPlan(null)
    }
    return () => { cancelled = true }
  }

  const handleExtendPlan = async (userId: string, months: number) => {
    let cancelled = false
    setSavingMonths(userId)
    try {
      const res = await authFetch(`/api/auth/admin/users/${userId}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json() as { plan: AdminUser['plan']; subscriptionStatus: string; planExpiresAt: string | null }
      if (!cancelled) {
        setUsers(prev => prev.map(u => u.id === userId
          ? { ...u, planExpiresAt: data.planExpiresAt }
          : u,
        ))
      }
    } catch {
      // silent
    } finally {
      if (!cancelled) setSavingMonths(null)
    }
    return () => { cancelled = true }
  }

  const handleToggleFlag = async (userId: string, flag: 'f1Enabled' | 'drinksEnabled', value: boolean) => {
    setSavingFlag(userId)
    try {
      const res = await authFetch(`/api/auth/admin/users/${userId}/flags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [flag]: value }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json() as { f1Enabled: boolean; drinksEnabled: boolean }
      setUsers(prev => prev.map(u => u.id === userId
        ? { ...u, f1Enabled: data.f1Enabled, drinksEnabled: data.drinksEnabled }
        : u,
      ))
    } catch {
      // silent
    } finally {
      setSavingFlag(null)
    }
  }

  const handleDelete = async (userId: string) => {
    let cancelled = false
    try {
      const res = await authFetch(`/api/auth/admin/users/${userId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      if (!cancelled) {
        setUsers(prev => prev.filter(u => u.id !== userId))
        setConfirmDelete(null)
      }
    } catch {
      if (!cancelled) setConfirmDelete(null)
    }
    return () => { cancelled = true }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })

  const formatExpiry = (iso: string) =>
    new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })

  const daysUntilExpiry = (iso: string) =>
    Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000))

  if (loading) return <p className={styles.adminEmpty}>Завантаження...</p>
  if (error)   return <p className={styles.adminEmpty}>{error}</p>

  const groupMap = buildFamilyGroups(users)

  // Build ordered list: collect groups together, singletons stay in order
  const groupOrder: string[] = []
  const seenGroups = new Set<string>()
  type Item = { type: 'user'; user: AdminUser } | { type: 'group'; groupId: string; members: AdminUser[] }
  const items: Item[] = []

  for (const u of users) {
    const gid = groupMap.get(u.id)
    if (!gid) {
      items.push({ type: 'user', user: u })
    } else if (!seenGroups.has(gid)) {
      seenGroups.add(gid)
      groupOrder.push(gid)
      const members = users.filter(x => groupMap.get(x.id) === gid)
      items.push({ type: 'group', groupId: gid, members })
    }
  }

  const renderUserCard = (u: AdminUser) => {
    const isExpanded = expandedId === u.id
    const isConfirming = confirmDelete === u.id
    const isSaving = savingPlan === u.id
    const isExtending = savingMonths === u.id
    const isTogglingFlag = savingFlag === u.id
    const expiryDays = u.planExpiresAt ? daysUntilExpiry(u.planExpiresAt) : null
    const expiryWarn = expiryDays !== null && expiryDays <= 3

    return (
      <div key={u.id} className={styles.adminUserRow}>
        {u.avatarUrl ? (
          <img src={u.avatarUrl} alt={u.name} className={styles.adminAvatar} width={40} height={40} />
        ) : (
          <div className={styles.adminAvatarInitial}>
            {(u.name || u.username || '?')[0].toUpperCase()}
          </div>
        )}

        <div className={styles.adminUserInfo}>
          <div className={styles.adminUserTop}>
            <span className={styles.adminUserName}>{u.name || u.username}</span>
            {u.role === 'admin' && <span className={styles.adminBadge}>ADMIN</span>}
            <span className={`${styles.adminPlanBadge} ${styles[`plan_${u.plan}`]}`}>
              {PLAN_LABELS[u.plan]}
            </span>
          </div>
          <span className={styles.adminUserSub}>@{u.username}{u.email ? ` · ${u.email}` : ''}</span>
          <span className={styles.adminUserDate}>{formatDate(u.createdAt)}</span>
          {u.planExpiresAt && (
            <span className={`${styles.adminExpiryDate} ${expiryWarn ? styles.adminExpiryWarn : ''}`}>
              до {formatExpiry(u.planExpiresAt)}
              {expiryWarn && expiryDays !== null && ` · ${expiryDays <= 0 ? 'прострочено' : `${expiryDays} дн`}`}
            </span>
          )}

          {/* Expanded: plan picker + months extension + delete */}
          {isExpanded && (
            <div className={styles.adminExpanded}>
              {/* Feature flags */}
              <div className={styles.adminFlagRow}>
                <button
                  type="button"
                  disabled={isTogglingFlag}
                  className={`${styles.adminFlagBtn} ${u.f1Enabled ? styles.adminFlagBtnOn : ''}`}
                  onClick={() => handleToggleFlag(u.id, 'f1Enabled', !u.f1Enabled)}
                >
                  F1 {u.f1Enabled ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  disabled={isTogglingFlag}
                  className={`${styles.adminFlagBtn} ${u.drinksEnabled ? styles.adminFlagBtnOn : ''}`}
                  onClick={() => handleToggleFlag(u.id, 'drinksEnabled', !u.drinksEnabled)}
                >
                  CELLAR {u.drinksEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className={styles.adminPlanRow}>
                {PLAN_OPTIONS.map(p => (
                  <button
                    key={p}
                    type="button"
                    disabled={isSaving || isExtending}
                    className={`${styles.adminPlanBtn} ${u.plan === p ? styles.adminPlanBtnActive : ''}`}
                    onClick={() => handleSetPlan(u.id, p)}
                  >
                    {PLAN_LABELS[p]}
                  </button>
                ))}
              </div>
              {u.plan !== 'free' && (
                <div className={styles.adminMonthRow}>
                  {([1, 3, 6, 12] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      disabled={isSaving || isExtending}
                      className={styles.adminMonthBtn}
                      onClick={() => handleExtendPlan(u.id, m)}
                    >
                      +{m}м
                    </button>
                  ))}
                </div>
              )}
              {isConfirming ? (
                <div className={styles.adminConfirmRow}>
                  <span className={styles.adminConfirmText}>Видалити акаунт?</span>
                  <button type="button" className={styles.adminConfirmYes} onClick={() => handleDelete(u.id)}>Так</button>
                  <button type="button" className={styles.adminConfirmNo} onClick={() => setConfirmDelete(null)}>Ні</button>
                </div>
              ) : (
                <button type="button" className={styles.adminDeleteBtn} onClick={() => setConfirmDelete(u.id)}>
                  Видалити акаунт
                </button>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className={`${styles.adminExpandBtn} ${isExpanded ? styles.adminExpandBtnOpen : ''}`}
          onClick={() => setExpandedId(isExpanded ? null : u.id)}
          aria-label={isExpanded ? 'Згорнути' : 'Розгорнути'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    )
  }

  return (
    <>
      <AnalyticsPanel />

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>КОРИСТУВАЧІ</span>
          <span className={styles.sectionCount}>{users.length}</span>
        </div>

        {users.length === 0 && <p className={styles.adminEmpty}>Немає користувачів</p>}

        <div className={styles.adminList}>
          {items.map((item) => {
            if (item.type === 'user') return renderUserCard(item.user)
            return (
              <div key={item.groupId} className={styles.adminFamilyGroup}>
                <span className={styles.adminFamilyLabel}>СІМ'Я</span>
                {item.members.map(u => renderUserCard(u))}
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}

export default AdminTab
