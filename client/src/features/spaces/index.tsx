import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppHeader from '@/shared/components/layout/AppHeader'
import { useSpacesStore, type Space } from '@/features/memories/store/spacesStore'
import { authFetch } from '@/shared/services/api'
import MemoryCard from '@/features/memories/components/memories/MemoryCard'
import PlanCard from '@/features/memories/components/memories/PlanCard'
import AddMemoryModal from '@/features/memories/components/memories/AddMemoryModal'
import PlanForm from '@/features/memories/components/memories/PlanForm'
import { useMemoriesStore } from '@/features/memories/store/memoriesStore'
import { usePlansStore, type Plan } from '@/features/memories/store/plansStore'
import type { Memory } from '@/features/memories/types/memory'
import type { AddMemoryData } from '@/features/memories/components/memories/AddMemoryModal'
import type { PlanInput } from '@/features/memories/store/plansStore'
import styles from './SpaceDetail.module.css'

const SPACE_TYPE_LABELS: Record<string, string> = {
  personal: 'Особисте',
  shared:   'Спільне',
  trip:     'Поїздка',
  family:   'Сім\'я',
  friends:  'Друзі',
  hobby:    'Хобі',
  sports:   'Спорт',
  project:  'Проєкт',
}

/**
 * SpaceDetailScreen
 * -----------------
 * Сторінка деталей простору: хедер, overview counts, учасники,
 * пов'язані спогади та плани. Quick actions → + Спогад / + План.
 */
const SpaceDetailScreen: React.FC = () => {
  const navigate = useNavigate()
  const { spaceId } = useParams<{ spaceId: string }>()
  const { spaces, fetchSpaces } = useSpacesStore()
  const { addMemory }  = useMemoriesStore()
  const { addPlan }    = usePlansStore()

  const [space, setSpace]         = useState<Space | null>(null)
  const [memories, setMemories]   = useState<Memory[]>([])
  const [plans, setPlans]         = useState<Plan[]>([])
  const [loading, setLoading]     = useState(true)
  const [addMemOpen, setAddMemOpen]   = useState(false)
  const [addPlanOpen, setAddPlanOpen] = useState(false)

  // Fetch space + linked content
  useEffect(() => {
    if (!spaceId) return
    let cancelled = false
    const load = async () => {
      // Space: try store first, fallback to API
      let found = spaces.find(s => s.id === spaceId) ?? null
      if (!found) {
        await fetchSpaces()
        found = useSpacesStore.getState().spaces.find(s => s.id === spaceId) ?? null
      }
      if (!cancelled) setSpace(found)

      // Memories & plans by spaceId
      const [memRes, planRes] = await Promise.all([
        authFetch(`/api/memories?spaceId=${spaceId}`),
        authFetch(`/api/plans?spaceId=${spaceId}`),
      ])

      if (!cancelled) {
        if (memRes.ok) {
          const raw = await memRes.json() as Record<string, unknown>[]
          setMemories(raw.map(d => ({
            id:               String(d._id ?? ''),
            title:            String(d.title ?? ''),
            date:             String(d.date ?? ''),
            dateEnd:          (d.dateEnd as string | null) ?? null,
            isTrip:           Boolean(d.isTrip),
            coverUrl:         String(d.coverUrl ?? ''),
            coverAttribution: (d.coverAttribution as string | undefined),
            location:         (d.location as string | undefined),
            lat:              (d.lat as number | null) ?? null,
            lng:              (d.lng as number | null) ?? null,
            notes:            String(d.notes ?? ''),
            tags:             (d.tags as string[]) ?? [],
            photos:           [],
            places:           [],
            createdAt:        String(d.createdAt ?? ''),
            spaceId:          (d.spaceId as string | null) ?? null,
            withProfiles:     (d.withProfiles as string[]) ?? [],
          })))
        }
        if (planRes.ok) {
          const raw = await planRes.json() as Plan[]
          setPlans(raw)
        }
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId])

  const handleAddMemory = async (data: AddMemoryData) => {
    await addMemory({ ...data, photos: [], spaceId: spaceId ?? null })
    // Refresh memories
    const res = await authFetch(`/api/memories?spaceId=${spaceId}`)
    if (res.ok) {
      const raw = await res.json() as Record<string, unknown>[]
      setMemories(raw.map(d => ({
        id: String(d._id ?? ''), title: String(d.title ?? ''), date: String(d.date ?? ''),
        dateEnd: (d.dateEnd as string | null) ?? null, isTrip: Boolean(d.isTrip),
        coverUrl: String(d.coverUrl ?? ''), coverAttribution: (d.coverAttribution as string | undefined),
        location: (d.location as string | undefined), lat: (d.lat as number | null) ?? null,
        lng: (d.lng as number | null) ?? null, notes: String(d.notes ?? ''),
        tags: (d.tags as string[]) ?? [], photos: [], places: [], createdAt: String(d.createdAt ?? ''),
        spaceId: (d.spaceId as string | null) ?? null, withProfiles: (d.withProfiles as string[]) ?? [],
      })))
    }
    setAddMemOpen(false)
  }

  const handleAddPlan = async (data: PlanInput) => {
    await addPlan({ ...data, spaceId: spaceId ?? null })
    const res = await authFetch(`/api/plans?spaceId=${spaceId}`)
    if (res.ok) setPlans(await res.json() as Plan[])
    setAddPlanOpen(false)
  }

  if (!loading && !space) {
    return (
      <div className={styles.root}>
        <AppHeader />
        <div className={styles.notFound}>
          <p>Простір не знайдено</p>
          <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>← Назад</button>
        </div>
      </div>
    )
  }

  const colorVar = { '--space-color': space?.color ?? 'var(--accent)' } as React.CSSProperties

  return (
    <div className={styles.root}>
      <AppHeader />

      {/* ── Hero header ── */}
      <div className={styles.hero} style={colorVar}>
        <div className={styles.heroAccent} />
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4l-5 5 5 5"/>
          </svg>
        </button>
        {loading ? (
          <div className={styles.heroSkeleton} />
        ) : (
          <>
            <span className={styles.heroEmoji}>{space?.emoji || '🌐'}</span>
            <div className={styles.heroInfo}>
              <h1 className={styles.heroName}>{space?.name}</h1>
              <span className={styles.heroType} style={colorVar}>
                {SPACE_TYPE_LABELS[space?.type ?? ''] ?? space?.type}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Overview counts ── */}
      <div className={styles.overview}>
        <div className={styles.overviewItem}>
          <span className={styles.overviewNum}>{loading ? '—' : memories.length}</span>
          <span className={styles.overviewLabel}>спогадів</span>
        </div>
        <div className={styles.overviewDivider} />
        <div className={styles.overviewItem}>
          <span className={styles.overviewNum}>{loading ? '—' : plans.length}</span>
          <span className={styles.overviewLabel}>планів</span>
        </div>
        <div className={styles.overviewDivider} />
        <div className={styles.overviewItem}>
          <span className={styles.overviewNum}>{loading ? '—' : (space?.members.length ?? 0)}</span>
          <span className={styles.overviewLabel}>учасників</span>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className={styles.actions}>
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={() => setAddMemOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 2v10M2 7h10"/>
          </svg>
          Спогад
        </button>
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={() => setAddPlanOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 2v10M2 7h10"/>
          </svg>
          План
        </button>
      </div>

      <div className={styles.content}>
        {/* ── Members ── */}
        {!loading && (space?.members?.length ?? 0) > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>УЧАСНИКИ</h2>
            <div className={styles.members}>
              {space!.members.map(m => (
                <div key={m.userId} className={styles.member}>
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} className={styles.memberAvatar} alt={m.name} />
                  ) : (
                    <span className={styles.memberInitial} style={colorVar}>{m.name[0]?.toUpperCase()}</span>
                  )}
                  <span className={styles.memberName}>{m.name}</span>
                  {m.role === 'owner' && <span className={styles.ownerBadge}>власник</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Memories ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>СПОГАДИ</h2>
          {loading ? (
            <div className={styles.memoriesGrid}>
              {[1,2,3,4].map(i => <div key={i} className={styles.skeleton} />)}
            </div>
          ) : memories.length === 0 ? (
            <div className={styles.empty}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
                <circle cx="16" cy="12" r="5"/><path d="M6 28c0-5.5 4.5-10 10-10s10 4.5 10 10"/>
                <path d="M22 7l2-2M10 7L8 5"/>
              </svg>
              <p>Немає спогадів у цьому просторі</p>
              <button type="button" className={styles.emptyAction} onClick={() => setAddMemOpen(true)}>Додати спогад</button>
            </div>
          ) : (
            <div className={styles.memoriesGrid}>
              {memories.map(m => (
                <MemoryCard key={m.id} memory={m} onClick={() => navigate(`/memories/${m.id}`)} />
              ))}
            </div>
          )}
        </section>

        {/* ── Plans ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>ПЛАНИ</h2>
          {loading ? (
            <div className={styles.plansCol}>
              {[1,2].map(i => <div key={i} className={`${styles.skeleton} ${styles.skeletonPlan}`} />)}
            </div>
          ) : plans.length === 0 ? (
            <div className={styles.empty}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
                <circle cx="16" cy="16" r="12"/>
                <path d="M10 16c2-4 5-7 10-7"/>
                <circle cx="16" cy="22" r="2" fill="currentColor" stroke="none"/>
              </svg>
              <p>Немає планів у цьому просторі</p>
              <button type="button" className={styles.emptyAction} onClick={() => setAddPlanOpen(true)}>Додати план</button>
            </div>
          ) : (
            <div className={styles.plansCol}>
              {plans.map(p => (
                <PlanCard key={p._id} plan={p} onClick={() => navigate(`/memories?plan=${p._id}`)} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Modals ── */}
      <AddMemoryModal
        isOpen={addMemOpen}
        onClose={() => setAddMemOpen(false)}
        onCreate={handleAddMemory}
        initialSpaceId={spaceId}
      />
      {addPlanOpen && (
        <PlanForm
          onClose={() => setAddPlanOpen(false)}
          onSubmit={handleAddPlan}
          initialSpaceId={spaceId}
        />
      )}
    </div>
  )
}

export default SpaceDetailScreen
