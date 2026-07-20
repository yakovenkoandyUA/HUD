import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '@/shared/components/layout/AppHeader'
import AddMemoryModal from './components/memories/AddMemoryModal'
import PlanCard from './components/memories/PlanCard'
import PlanForm from './components/memories/PlanForm'
import MemoryMap from './components/memories/MemoryMap'
import TripExpensesSheet from './components/memories/TripExpensesSheet'
import FlashbackModal from './components/memories/FlashbackModal'
import type { AddMemoryData } from './components/memories/AddMemoryModal'
import type { Memory } from './types/memory'
import { useMemoriesStore } from '@/features/memories/store/memoriesStore'
import { usePlansStore, type Plan } from '@/features/memories/store/plansStore'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import { useFamilyStore } from '@/shared/store/familyStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useFinanceStore } from '@/features/finance/store/financeStore'
import { authFetch } from '@/shared/services/api'
import { uploadToCloudinary } from '@/shared/utils/uploadToCloudinary'
import FabHint from '@/shared/components/ui/FabHint'
import MimirHint from '@/shared/components/ui/MimirHint'
import { useAchievementsStore } from '@/shared/store/achievementsStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { MIMIR_DIALOGUE, getMimirText } from '@/shared/data/mimirDialogue'
import { getMimirHistory, isDailyEligible, markDailyShown } from '@/shared/utils/mimirHistory'
import { haversineKm } from './utils/geo'
import { useSwipeTabs } from '@/shared/hooks/useSwipeTabs'
import styles from './Memories.module.css'

interface TripSheetData {
  memoryId: string
  memoryTitle: string
  dateFrom: string
  dateTo: string
}

type ActiveTab = 'memories' | 'plans' | 'map'
const TAB_ORDER: ActiveTab[] = ['memories', 'plans', 'map']

function groupByMonth(memories: Memory[]): [string, Memory[]][] {
  const groups: Record<string, Memory[]> = {}
  ;[...memories]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach(m => {
      const key = new Date(m.date)
        .toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })
        .replace(/ р\./i, '')
        .toUpperCase()
      if (!groups[key]) groups[key] = []
      groups[key].push(m)
    })
  return Object.entries(groups)
}

function coverSrc(m: Memory): string | null {
  return m.coverUrl || m.photos[0]?.url || null
}

function titleGradient(title: string): string {
  let hash = 0
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0
  const hue = Math.abs(hash) % 360
  return `linear-gradient(155deg, hsl(${hue},28%,21%) 0%, hsl(${(hue + 45) % 360},22%,15%) 100%)`
}

function tripDateLabel(m: Memory): string {
  if (m.isTrip && m.dateEnd) {
    const [y1, m1, d1] = m.date.split('-').map(Number)
    const [y2, m2, d2] = m.dateEnd.split('-').map(Number)
    const days = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1
    const endDate = new Date(m.dateEnd)
    return `${d1} — ${d2} ${endDate.toLocaleDateString('uk-UA', { month: 'short' })} · ${days}д`
  }
  return new Date(m.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
}

function yearsAgoLabel(years: number): string {
  const mod100 = years % 100
  const mod10  = years % 10
  if (mod100 >= 11 && mod100 <= 14) return `${years} РОКІВ ТОМУ`
  if (mod10 === 1) return `${years} РІК ТОМУ`
  if (mod10 >= 2 && mod10 <= 4) return `${years} РОКИ ТОМУ`
  return `${years} РОКІВ ТОМУ`
}

/**
 * MemoriesScreen
 * --------------
 * Two-tab screen: СПОГАДИ (monthly timeline) + ПЛАНИ (places to visit / visited).
 */
const MemoriesScreen: React.FC = () => {
  const navigate    = useNavigate()
  const { memories, isLoading: memoriesLoading, fetchMemories, addMemory } = useMemoriesStore()
  const { plans, fetchPlans, addPlan, updatePlan, deletePlan } = usePlansStore()
  const { accepted, fetchFamily } = useFamilyStore()
  const { showToast, mimirMode } = useUiStore()
  const { transactions } = useFinanceStore()
  const userId = useProfileStore(s => s.activeProfile?.id ?? '')

  const [showMemoriesEmpty, setShowMemoriesEmpty] = useState(false)
  const memoriesEmptyDecided = useRef(false)

  useEffect(() => {
    if (memoriesLoading || memoriesEmptyDecided.current || !userId) return
    memoriesEmptyDecided.current = true
    if (memories.length === 0) {
      const h = getMimirHistory(userId)
      if (isDailyEligible(h, 'memories_empty')) setShowMemoriesEmpty(true)
    }
  }, [memoriesLoading, memories.length, userId])

  const companionMap = useMemo(() =>
    Object.fromEntries(accepted.map(m => [m.id, m])),
  [accepted])

  const [activeTab,     setActiveTab]     = useState<ActiveTab>('memories')
  const [showAdd,       setShowAdd]       = useState(false)
  const [showPlanForm,  setShowPlanForm]  = useState(false)
  const [selectedPlan,  setSelectedPlan]  = useState<Plan | null>(null)
  const [convertPrompt,  setConvertPrompt]  = useState<Plan | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [tripSheet, setTripSheet] = useState<TripSheetData | null>(null)
  const [pendingNav,  setPendingNav]  = useState<string | null>(null)
  const [showFlashback, setShowFlashback] = useState(false)
  const [statSheet, setStatSheet]         = useState<'count' | 'photos' | 'locations' | 'distance' | null>(null)
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)

  const { spaces, fetchSpaces } = useSpacesStore()
  useEffect(() => { fetchSpaces() }, [fetchSpaces])

  const swipeRef = useSwipeTabs({
    count: TAB_ORDER.length,
    activeIndex: TAB_ORDER.indexOf(activeTab),
    onChange: i => setActiveTab(TAB_ORDER[i]),
    // Map tab has its own pan gesture — disable swipe to avoid conflict
    enabled: activeTab !== 'map',
  })

  useEffect(() => { fetchMemories() }, [fetchMemories])
  useEffect(() => { fetchFamily() }, [fetchFamily])

  useEffect(() => {
    if (activeTab === 'plans' || activeTab === 'map') fetchPlans()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const filteredMemories = useMemo(
    () => selectedSpaceId ? memories.filter(m => m.spaceId === selectedSpaceId) : memories,
    [memories, selectedSpaceId]
  )
  const filteredPlans = useMemo(
    () => selectedSpaceId ? plans.filter(p => p.spaceId === selectedSpaceId) : plans,
    [plans, selectedSpaceId]
  )

  const grouped = useMemo(() => groupByMonth(filteredMemories), [filteredMemories])

  const thisDay = useMemo(() => {
    const now   = new Date()
    const month = now.getMonth()
    const day   = now.getDate()
    return memories
      .filter(m => {
        const d = new Date(m.date)
        return d.getMonth() === month && d.getDate() === day && d.getFullYear() < now.getFullYear()
      })
      .map(m => ({ memory: m, yearsAgo: now.getFullYear() - new Date(m.date).getFullYear() }))
      .sort((a, b) => a.yearsAgo - b.yearsAgo)
  }, [memories])

  const stats = useMemo(() => {
    const totalPhotos = memories.reduce((s, m) => s + m.photos.length, 0)

    const locationCounts = new Map<string, number>()
    memories.forEach(m => {
      const loc = m.location?.trim()
      if (loc) locationCounts.set(loc, (locationCounts.get(loc) ?? 0) + 1)
    })
    const locationsList = [...locationCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const withCoords = memories
      .filter(m => m.lat != null && m.lng != null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    let totalDistanceKm = 0
    const segments: { from: Memory; to: Memory; km: number }[] = []
    for (let i = 1; i < withCoords.length; i++) {
      const km = Math.round(haversineKm(
        { lat: withCoords[i - 1].lat!, lng: withCoords[i - 1].lng! },
        { lat: withCoords[i].lat!, lng: withCoords[i].lng! }
      ))
      if (km > 0) {
        segments.push({ from: withCoords[i - 1], to: withCoords[i], km })
        totalDistanceKm += km
      }
    }

    return {
      count: memories.length,
      totalPhotos,
      uniqueLocations: locationCounts.size,
      locationsList,
      totalDistanceKm: Math.round(totalDistanceKm),
      segments: segments.sort((a, b) => b.km - a.km).slice(0, 5),
    }
  }, [memories])

  // Показати флешбек-попап раз на добу
  useEffect(() => {
    if (thisDay.length === 0) return
    const key = `hud-flashback-${new Date().toISOString().slice(0, 10)}`
    if (!sessionStorage.getItem(key)) {
      setShowFlashback(true)
      sessionStorage.setItem(key, '1')
    }
  }, [thisDay])

  const currentMonthKey = useMemo(
    () => new Date()
      .toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })
      .replace(/ р\./i, '')
      .toUpperCase(),
    []
  )

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, planId: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const url = await uploadToCloudinary(file, 'mimir/plans')
      await usePlansStore.getState().addPhoto(planId, url)
    } catch {
      showToast('Помилка завантаження фото', 'error')
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
  }

  const handleCreate = async (data: AddMemoryData) => {
    const id = await addMemory({
      title:    data.title,
      location: data.location,
      lat:      data.lat,
      lng:      data.lng,
      date:     data.date,
      dateEnd:  data.dateEnd,
      isTrip:   data.isTrip,
      coverUrl:     data.coverUrl,
      notes:        data.notes,
      tags:         data.tags,
      withProfiles: data.withProfiles,
      spaceId:      data.spaceId ?? null,
      photos:       [],
    })
    useAchievementsStore.getState().unlock('first-memory')
    setShowAdd(false)

    if (data.isTrip && data.dateEnd) {
      const dateFrom = data.date
      const dateTo   = data.dateEnd
      const hasExpenses = transactions.some(
        t => t.type === 'expense' && t.date.slice(0, 10) >= dateFrom && t.date.slice(0, 10) <= dateTo && !t.tripMemoryId
      )
      if (hasExpenses) {
        setPendingNav(`/memories/${id}`)
        setTripSheet({ memoryId: id, memoryTitle: data.title, dateFrom, dateTo })
        return
      }
    }

    navigate(`/memories/${id}`)
  }

  const handleVisited = (plan: Plan) => {
    updatePlan(plan._id, { status: 'visited', visitedDate: new Date().toISOString() })
    setConvertPrompt(plan)
    setSelectedPlan(null)
  }

  const handleCreateMemory = async (plan: Plan) => {
    try {
      const r = await authFetch('/api/memories', {
        method: 'POST',
        body: JSON.stringify({
          title:    plan.title,
          date:     new Date().toISOString().slice(0, 10),
          notes:    plan.notes,
          photos:   plan.photos,
          location: plan.location?.name ?? '',
          lat:      plan.location?.lat ?? null,
          lng:      plan.location?.lng ?? null,
        }),
      })
      if (r.ok) {
        const memory = await r.json()
        await updatePlan(plan._id, { memoryId: memory._id })
        setConvertPrompt(null)
        setActiveTab('memories')
        fetchMemories()
        showToast('Спогад створено!', 'success')
      }
    } catch {
      showToast('Помилка при створенні спогаду', 'error')
    }
  }

  const handleDeletePlan = (plan: Plan) => {
    deletePlan(plan._id)
    setSelectedPlan(null)
    showToast('План видалено', 'info')
  }

  return (
    <div ref={swipeRef} className={styles.screen}>
      <AppHeader />

      {/* ── Tab bar ── */}
      <div className={styles.tabBar}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'memories' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('memories')}
        >
          СПОГАДИ
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'plans' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          ПЛАНИ
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'map' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('map')}
        >
          КАРТА
        </button>
      </div>

      {/* ── Space filter strip ── */}
      {spaces.length > 0 && activeTab !== 'map' && (
        <div className={styles.spaceFilterRow}>
          <button
            type="button"
            className={`${styles.spaceFilterChip} ${!selectedSpaceId ? styles.spaceFilterChipAll : ''}`}
            onClick={() => setSelectedSpaceId(null)}
          >
            Всі
          </button>
          {spaces.map(s => (
            <button
              key={s.id}
              type="button"
              className={styles.spaceFilterChip}
              style={selectedSpaceId === s.id ? { borderColor: s.color, color: s.color } : undefined}
              onClick={() => setSelectedSpaceId(prev => prev === s.id ? null : s.id)}
            >
              <span className={styles.spaceFilterDot} style={{ background: s.color }} />
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Memories tab ── */}
      {activeTab === 'memories' && (
        <>
          {memoriesLoading ? (
            <div className={styles.memoriesSkeleton}>
              {Array.from({ length: 9 }, (_, i) => <div key={i} className={styles.skeletonCard} />)}
            </div>
          ) : filteredMemories.length === 0 ? (
            <>
              {showMemoriesEmpty && !selectedSpaceId && (
                <div className={styles.mimirFloat}>
                  <MimirHint
                    pose={MIMIR_DIALOGUE.memories_empty.pose}
                    textKey={getMimirText('memories_empty', mimirMode)}
                    onDismiss={() => { setShowMemoriesEmpty(false); markDailyShown(userId, 'memories_empty') }}
                  />
                </div>
              )}
              <div className={styles.empty}>
                <svg className={styles.emptyIcon} width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
                  <rect x="6" y="14" width="60" height="44" rx="6" stroke="currentColor" strokeWidth="2.5"/>
                  <circle cx="22" cy="28" r="5" stroke="currentColor" strokeWidth="2.5"/>
                  <path d="M6 44l16-14 12 11 8-8 24 23" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className={styles.emptyTitle}>{selectedSpaceId ? 'У цьому просторі ще немає спогадів' : 'Ще немає спогадів'}</p>
                <p className={styles.emptyHint}>{selectedSpaceId ? 'Додай перший!' : 'Додай перший!'}</p>
              </div>
            </>
          ) : (
            <div className={styles.timeline}>
              {/* Stats row — інтерактивний */}
              <div className={styles.statsRow}>
                <button className={styles.statBtn} onClick={() => setStatSheet('count')}>
                  <b className={styles.statNum}>{stats.count}</b> спогадів
                </button>
                <span className={styles.statsDot}>·</span>
                <button className={styles.statBtn} onClick={() => setStatSheet('photos')}>
                  <b className={styles.statNum}>{stats.totalPhotos}</b> фото
                </button>
                <span className={styles.statsDot}>·</span>
                <button className={styles.statBtn} onClick={() => setStatSheet('locations')}>
                  <b className={styles.statNum}>{stats.uniqueLocations}</b> місць
                </button>
                {stats.totalDistanceKm > 0 && (
                  <>
                    <span className={styles.statsDot}>·</span>
                    <button className={styles.statBtn} onClick={() => setStatSheet('distance')}>
                      <b className={styles.statNum}>{stats.totalDistanceKm}</b> км
                    </button>
                  </>
                )}
              </div>

              {/* This Day banner — покращений */}
              {thisDay.length > 0 && (
                <button
                  type="button"
                  className={styles.thisDayBanner}
                  onClick={() => setShowFlashback(true)}
                >
                  {(() => {
                    const cover = thisDay[0].memory.coverUrl || thisDay[0].memory.photos[0]?.url
                    return cover ? (
                      <img src={cover} alt="" className={styles.thisDayThumb} />
                    ) : (
                      <div className={styles.thisDayThumbEmpty}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                          <path d="M7 4v3.2l1.8 1.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                      </div>
                    )
                  })()}
                  <div className={styles.thisDayContent}>
                    <p className={styles.thisDayTitle}>
                      ЦЬОГО ДНЯ · {yearsAgoLabel(thisDay[0].yearsAgo)}
                    </p>
                    <p className={styles.thisDayMemory}>
                      {thisDay[0].memory.title}
                      {thisDay.length > 1 && (
                        <span className={styles.thisDayMore}> +{thisDay.length - 1}</span>
                      )}
                    </p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={styles.thisDayChevron}>
                    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}

              {/* Grouped timeline */}
              {grouped.map(([monthLabel, items]) => (
                <div key={monthLabel} className={styles.monthSection}>
                  <div className={styles.monthHeader}>
                    <div className={`${styles.monthDot} ${monthLabel === currentMonthKey ? styles.monthDotCurrent : ''}`} />
                    <span className={styles.monthLabel}>{monthLabel}</span>
                    <div className={styles.monthLine} />
                    <span className={styles.monthCount}>{items.length}</span>
                  </div>

                  <div className={styles.memoriesGrid}>
                    {items.map(m => (
                      <div
                        key={m.id}
                        className={styles.card}
                        onClick={() => navigate(`/memories/${m.id}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && navigate(`/memories/${m.id}`)}
                      >
                        {coverSrc(m) ? (
                          <img src={coverSrc(m)!} alt={m.title} className={styles.cardImg} loading="lazy" />
                        ) : (
                          <div className={styles.cardPlaceholder} style={{ background: titleGradient(m.title) }} />
                        )}
                        <div className={styles.cardGrad} />
                        <div className={styles.cardInfo}>
                          <p className={styles.cardTitle}>{m.title}</p>
                          <p className={styles.cardDate}>{tripDateLabel(m)}</p>
                        </div>
                        {m.photos.length > 0 && (
                          <div className={styles.cardPhotoCount}>
                            <svg width="9" height="9" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                              <rect x="1.5" y="2.5" width="11" height="9" rx="1.3" stroke="currentColor" strokeWidth="1.3" />
                              <circle cx="4.7" cy="5.5" r="1" fill="currentColor" />
                              <path d="M2 9.5l3-3 2 2 2.5-3 2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {m.photos.length}
                          </div>
                        )}
                        {m.ownerName && (
                          <div className={styles.cardOwnerBadge} title={m.ownerName}>
                            {m.ownerAvatarUrl
                              ? <img src={m.ownerAvatarUrl} alt={m.ownerName} className={styles.cardOwnerAvatar} />
                              : <span className={styles.cardOwnerInitial}>{m.ownerName[0]}</span>
                            }
                          </div>
                        )}
                        {(m.withProfiles ?? []).length > 0 && (
                          <div className={styles.cardCompanions}>
                            {(m.withProfiles ?? []).slice(0, 3).map(id => {
                              const c = companionMap[id]
                              if (!c) return null
                              return c.avatarUrl
                                ? <img key={id} src={c.avatarUrl} alt={c.name} className={styles.cardCompanionAvatar} title={c.name} />
                                : <span key={id} className={styles.cardCompanionInitial} title={c.name}>{c.name[0]?.toUpperCase()}</span>
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {memories.length === 0 && <FabHint storageKey="memories" text="Додай спогад" />}
          <button
            type="button"
            className={styles.fab}
            onClick={() => setShowAdd(true)}
            aria-label="Додати спогад"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M3 11h16M11 3v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          <AddMemoryModal
            isOpen={showAdd}
            onClose={() => setShowAdd(false)}
            onCreate={handleCreate}
          />
        </>
      )}

      {/* ── Plans tab ── */}
      {activeTab === 'plans' && (
        <>
          {filteredPlans.length === 0 ? (
            <div className={styles.empty}>
              <svg className={styles.emptyIcon} width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
                <path d="M36 10c-10.5 0-18 8.5-18 19 0 14 18 33 18 33s18-19 18-33c0-10.5-7.5-19-18-19z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
                <circle cx="36" cy="29" r="6.5" stroke="currentColor" strokeWidth="2.5"/>
              </svg>
              <p className={styles.emptyTitle}>{selectedSpaceId ? 'У цьому просторі планів немає' : 'Планів ще немає'}</p>
              <p className={styles.emptyHint}>Додай місце яке хочеш відвідати</p>
            </div>
          ) : (
            <div className={styles.plansGrid}>
              {filteredPlans.map(p => (
                <PlanCard
                  key={p._id}
                  plan={p}
                  onClick={() => setSelectedPlan(p)}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            className={styles.fab}
            onClick={() => setShowPlanForm(true)}
            aria-label="Додати план"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M3 11h16M11 3v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          {showPlanForm && (
            <PlanForm
              onSubmit={(data) => { addPlan(data); showToast('План додано', 'success') }}
              onClose={() => setShowPlanForm(false)}
            />
          )}
        </>
      )}

      {/* ── Plan detail sheet ── */}
      {selectedPlan && (
        <div className={styles.planOverlay} onClick={() => setSelectedPlan(null)}>
          <div className={styles.planSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.handle} />
            <h2 className={styles.planTitle}>{selectedPlan.title}</h2>
            {selectedPlan.location?.name && (
              <p className={styles.planLocation}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1a3 3 0 0 1 3 3c0 2.5-3 7-3 7S3 6.5 3 4a3 3 0 0 1 3-3Z"
                    stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                {selectedPlan.location.name}
              </p>
            )}
            {selectedPlan.notes && (
              <p className={styles.planNotes}>{selectedPlan.notes}</p>
            )}

            {/* Photos */}
            <div className={styles.planPhotos}>
              {selectedPlan.photos.map(ph => (
                <img key={ph._id} src={ph.url} alt="" className={styles.planPhoto} />
              ))}
              <label className={`${styles.addPhotoBtn} ${uploadingPhoto ? styles.addPhotoBtnLoading : ''}`}>
                {uploadingPhoto ? (
                  <span className={styles.uploadSpinner} />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M3 10h14M10 3v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className={styles.fileInput}
                  disabled={uploadingPhoto}
                  onChange={e => handlePhotoUpload(e, selectedPlan._id)}
                />
              </label>
            </div>

            <div className={styles.planActions}>
              {selectedPlan.status !== 'visited' && (
                <button type="button" className={styles.visitedBtn} onClick={() => handleVisited(selectedPlan)}>
                  Відвідали ✓
                </button>
              )}
              {selectedPlan.location?.lat && selectedPlan.location?.lng && (
                <a
                  href={`https://www.google.com/maps?q=${selectedPlan.location.lat},${selectedPlan.location.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.mapsLink}
                >
                  Відкрити в Maps
                </a>
              )}
              <button type="button" className={styles.deleteBtn} onClick={() => handleDeletePlan(selectedPlan)}>
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Convert to memory dialog ── */}
      {convertPrompt && (
        <div className={styles.planOverlay} onClick={() => setConvertPrompt(null)}>
          <div className={styles.convertDialog} onClick={e => e.stopPropagation()}>
            <p className={styles.convertText}>
              Створити спогад про «{convertPrompt.title}»?
            </p>
            <div className={styles.convertActions}>
              <button type="button" className={styles.convertYes} onClick={() => handleCreateMemory(convertPrompt)}>
                Так, створити
              </button>
              <button type="button" className={styles.convertNo} onClick={() => setConvertPrompt(null)}>
                Пізніше
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Map tab ── */}
      {activeTab === 'map' && (
        <div className={styles.mapTab}>
          <MemoryMap plans={plans} memories={memories} />
        </div>
      )}

      {/* ── Flashback modal ── */}
      {showFlashback && thisDay.length > 0 && (
        <FlashbackModal items={thisDay} onClose={() => setShowFlashback(false)} />
      )}

      {/* ── Stats detail sheet ── */}
      {statSheet && (
        <div className={styles.planOverlay} onClick={() => setStatSheet(null)}>
          <div className={styles.planSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.handle} />
            <p className={styles.statSheetTitle}>
              {statSheet === 'count'     && 'СПОГАДИ'}
              {statSheet === 'photos'    && 'ФОТОГРАФІЇ'}
              {statSheet === 'locations' && 'МІСЦЯ'}
              {statSheet === 'distance'  && 'ПОДОРОЖІ'}
            </p>

            {statSheet === 'count' && (
              <div className={styles.statSheetContent}>
                <div className={styles.statHero}>
                  <span className={styles.statHeroNum}>{stats.count}</span>
                  <span className={styles.statHeroLabel}>спогадів</span>
                </div>
                <p className={styles.statHint}>
                  Середньо {(stats.count / Math.max(1, new Set(memories.map(m => m.date.slice(0, 4))).size)).toFixed(1)} на рік
                </p>
              </div>
            )}

            {statSheet === 'photos' && (
              <div className={styles.statSheetContent}>
                <div className={styles.statHero}>
                  <span className={styles.statHeroNum}>{stats.totalPhotos}</span>
                  <span className={styles.statHeroLabel}>фотографій</span>
                </div>
                <p className={styles.statHint}>
                  Середньо {stats.count > 0 ? (stats.totalPhotos / stats.count).toFixed(1) : 0} фото на спогад
                </p>
              </div>
            )}

            {statSheet === 'locations' && (
              <div className={styles.statSheetList}>
                {stats.locationsList.length === 0 ? (
                  <p className={styles.statEmpty}>Немає спогадів з місцями</p>
                ) : stats.locationsList.map(({ name, count }) => (
                  <div key={name} className={styles.statListRow}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={styles.statPin}>
                      <path d="M6 1a3 3 0 013 3c0 2.5-3 7-3 7S3 6.5 3 4a3 3 0 013-3z" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                    <span className={styles.statListName}>{name}</span>
                    <span className={styles.statListCount}>{count}×</span>
                  </div>
                ))}
              </div>
            )}

            {statSheet === 'distance' && (
              <div className={styles.statSheetContent}>
                <div className={styles.statHero}>
                  <span className={styles.statHeroNum}>{stats.totalDistanceKm}</span>
                  <span className={styles.statHeroLabel}>км подорожей</span>
                </div>
                <p className={styles.statHint}>Топ відстані між спогадами</p>
                <div className={styles.statSheetList}>
                  {stats.segments.map((s, i) => (
                    <div key={i} className={styles.statListRow}>
                      <span className={styles.statListName}>
                        {s.from.title}
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ margin: '0 4px', opacity: 0.4 }}>
                          <path d="M1 5h8M6 2l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                        {s.to.title}
                      </span>
                      <span className={styles.statListCount}>{s.km} км</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Trip expenses sheet ── */}
      {tripSheet && (
        <TripExpensesSheet
          isOpen={!!tripSheet}
          onClose={() => {
            const dest = pendingNav
            setTripSheet(null)
            setPendingNav(null)
            if (dest) navigate(dest)
          }}
          memoryId={tripSheet.memoryId}
          memoryTitle={tripSheet.memoryTitle}
          dateFrom={tripSheet.dateFrom}
          dateTo={tripSheet.dateTo}
        />
      )}
    </div>
  )
}

export default MemoriesScreen
