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

interface SpaceCtx {
  typeLabel: string
  description: string
  memBtnLabel: string
  planBtnLabel: string
  memEmptyTitle: string
  memEmptyDesc: string
  planEmptyTitle: string
  planEmptyDesc: string
}

const SPACE_CONTEXT: Record<string, SpaceCtx> = {
  personal: {
    typeLabel:      'Особисте',
    description:    'Твій особистий простір — спогади, плани й думки тільки для тебе.',
    memBtnLabel:    '+ Спогад',
    planBtnLabel:   '+ План',
    memEmptyTitle:  'Спогадів ще немає',
    memEmptyDesc:   'Додай особистий момент — щось що хочеш запам\'ятати.',
    planEmptyTitle: 'Планів ще немає',
    planEmptyDesc:  'Запиши ціль або щось що хочеш зробити.',
  },
  shared: {
    typeLabel:      'Спільне',
    description:    'Спільний простір для людей, речей і планів що вас об\'єднують.',
    memBtnLabel:    '+ Спільний спогад',
    planBtnLabel:   '+ Спільний план',
    memEmptyTitle:  'Спогадів ще немає',
    memEmptyDesc:   'Додай перший спільний момент.',
    planEmptyTitle: 'Планів ще немає',
    planEmptyDesc:  'Запиши першу спільну ідею або план.',
  },
  trip: {
    typeLabel:      'Поїздка',
    description:    'Збирай тут плани, спогади, місця й враження цієї поїздки — до, під час і після.',
    memBtnLabel:    '+ Момент поїздки',
    planBtnLabel:   '+ Ідея маршруту',
    memEmptyTitle:  'Спогадів ще немає',
    memEmptyDesc:   'Додай перший момент з цієї поїздки: фото, коротку історію або місце.',
    planEmptyTitle: 'Планів ще немає',
    planEmptyDesc:  'Запиши маршрут, ідею, бронювання або щось що хочеш не забути.',
  },
  family: {
    typeLabel:      'Сім\'я',
    description:    'Спільний простір для сімейних спогадів, планів і важливих моментів.',
    memBtnLabel:    '+ Сімейний спогад',
    planBtnLabel:   '+ Сімейний план',
    memEmptyTitle:  'Спогадів ще немає',
    memEmptyDesc:   'Додай перший сімейний момент — фото, подія або просто що трапилось.',
    planEmptyTitle: 'Планів ще немає',
    planEmptyDesc:  'Запиши ідею для спільного часу — поїздка, вечеря, традиція.',
  },
  friends: {
    typeLabel:      'Друзі',
    description:    'Збирай тут спільні моменти, плани і що ще хочете зробити разом.',
    memBtnLabel:    '+ Спогад з друзями',
    planBtnLabel:   '+ Планую разом',
    memEmptyTitle:  'Спогадів ще немає',
    memEmptyDesc:   'Збережи перший момент з цими людьми.',
    planEmptyTitle: 'Планів ще немає',
    planEmptyDesc:  'Запиши що хочете зробити разом — куди піти, що спробувати.',
  },
  hobby: {
    typeLabel:      'Хобі',
    description:    'Простір для занять, прогресу й важливих моментів із цього хобі.',
    memBtnLabel:    '+ Подія',
    planBtnLabel:   '+ Ціль',
    memEmptyTitle:  'Подій ще немає',
    memEmptyDesc:   'Додай перший момент з цього хобі — тренування, виступ, досягнення.',
    planEmptyTitle: 'Цілей ще немає',
    planEmptyDesc:  'Постав ціль або заплануй наступний крок у цьому хобі.',
  },
  sports: {
    typeLabel:      'Спорт',
    description:    'Тренування, змагання, результати — всі спортивні моменти тут.',
    memBtnLabel:    '+ Результат',
    planBtnLabel:   '+ Тренування',
    memEmptyTitle:  'Результатів ще немає',
    memEmptyDesc:   'Додай перше тренування, змагання або досягнення.',
    planEmptyTitle: 'Тренувань ще немає',
    planEmptyDesc:  'Заплануй наступне тренування або постав спортивну ціль.',
  },
  project: {
    typeLabel:      'Проєкт',
    description:    'Збирай тут задачі, нотатки й прогрес цього проєкту.',
    memBtnLabel:    '+ Milestone',
    planBtnLabel:   '+ Задача',
    memEmptyTitle:  'Досягнень ще немає',
    memEmptyDesc:   'Фіксуй ключові моменти та досягнення проєкту.',
    planEmptyTitle: 'Задач ще немає',
    planEmptyDesc:  'Запиши першу задачу або ціль цього проєкту.',
  },
}

const DEFAULT_CTX: SpaceCtx = {
  typeLabel:      '',
  description:    '',
  memBtnLabel:    '+ Спогад',
  planBtnLabel:   '+ План',
  memEmptyTitle:  'Спогадів ще немає',
  memEmptyDesc:   'Додай перший спогад у цей простір.',
  planEmptyTitle: 'Планів ще немає',
  planEmptyDesc:  'Запиши перший план або ціль.',
}

/**
 * SpaceDetailScreen
 * -----------------
 * Сторінка деталей простору: hero з описом, overview counts, учасники,
 * пов'язані спогади та плани. Quick actions — контекстні мітки per type.
 * Empty states — контекстний copy per type.
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

  useEffect(() => {
    if (!spaceId) return
    let cancelled = false
    const load = async () => {
      let found = spaces.find(s => s.id === spaceId) ?? null
      if (!found) {
        await fetchSpaces()
        found = useSpacesStore.getState().spaces.find(s => s.id === spaceId) ?? null
      }
      if (!cancelled) setSpace(found)

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

  const refreshMemories = async () => {
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
  }

  const handleAddMemory = async (data: AddMemoryData) => {
    await addMemory({ ...data, photos: [], spaceId: spaceId ?? null })
    await refreshMemories()
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

  const ctx = SPACE_CONTEXT[space?.type ?? ''] ?? DEFAULT_CTX
  const colorVar = { '--space-color': space?.color ?? 'var(--accent)' } as React.CSSProperties

  return (
    <div className={styles.root}>
      <AppHeader />

      {/* ── Hero ── */}
      <div className={styles.hero} style={colorVar}>
        <div className={styles.heroAccent} />
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Назад">
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
                {ctx.typeLabel || (SPACE_CONTEXT[space?.type ?? '']?.typeLabel ?? space?.type)}
              </span>
              {ctx.description && (
                <p className={styles.heroDesc}>{ctx.description}</p>
              )}
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
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 2v10M2 7h10"/>
          </svg>
          {ctx.memBtnLabel}
        </button>
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={() => setAddPlanOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 2v10M2 7h10"/>
          </svg>
          {ctx.planBtnLabel}
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
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" aria-hidden="true">
                <circle cx="16" cy="12" r="5"/><path d="M6 28c0-5.5 4.5-10 10-10s10 4.5 10 10"/>
                <path d="M22 7l2-2M10 7L8 5"/>
              </svg>
              <p className={styles.emptyTitle}>{ctx.memEmptyTitle}</p>
              <p className={styles.emptyDesc}>{ctx.memEmptyDesc}</p>
              <button type="button" className={styles.emptyAction} style={colorVar} onClick={() => setAddMemOpen(true)}>
                {ctx.memBtnLabel}
              </button>
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
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" aria-hidden="true">
                <rect x="6" y="8" width="20" height="18" rx="3"/>
                <path d="M11 14h10M11 19h7"/>
                <path d="M20 4v8M12 4v8"/>
              </svg>
              <p className={styles.emptyTitle}>{ctx.planEmptyTitle}</p>
              <p className={styles.emptyDesc}>{ctx.planEmptyDesc}</p>
              <button type="button" className={styles.emptyAction} style={colorVar} onClick={() => setAddPlanOpen(true)}>
                {ctx.planBtnLabel}
              </button>
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
