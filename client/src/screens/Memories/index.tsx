import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'
import AddMemoryModal from '../../components/memories/AddMemoryModal'
import PlanCard from '../../components/memories/PlanCard'
import PlanForm from '../../components/memories/PlanForm'
import MemoryMap from '../../components/memories/MemoryMap'
import type { AddMemoryData } from '../../components/memories/AddMemoryModal'
import type { Memory } from '../../types/memory'
import { useMemoriesStore } from '../../store/memoriesStore'
import { usePlansStore, type Plan } from '../../store/plansStore'
import { useUiStore } from '../../store/uiStore'
import { authFetch } from '../../services/api'
import { uploadToCloudinary } from '../../utils/uploadToCloudinary'
import DoodleIllustration from '../../components/ui/DoodleIllustration'
import FabHint from '../../components/ui/FabHint'
import { useAchievementsStore } from '../../store/achievementsStore'
import { haversineKm } from '../../utils/geo'
import styles from './Memories.module.css'

type ActiveTab = 'memories' | 'plans' | 'map'

function groupByMonth(memories: Memory[]): [string, Memory[]][] {
  const groups: Record<string, Memory[]> = {}
  ;[...memories]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach(m => {
      const key = new Date(m.date)
        .toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })
        .toUpperCase()
      if (!groups[key]) groups[key] = []
      groups[key].push(m)
    })
  return Object.entries(groups)
}

function coverSrc(m: Memory): string | null {
  return m.coverUrl || m.photos[0]?.url || null
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
  const { memories, fetchMemories, addMemory } = useMemoriesStore()
  const { plans, fetchPlans, addPlan, updatePlan, deletePlan } = usePlansStore()
  const { showToast } = useUiStore()

  const [activeTab,     setActiveTab]     = useState<ActiveTab>('memories')
  const [showAdd,       setShowAdd]       = useState(false)
  const [showPlanForm,  setShowPlanForm]  = useState(false)
  const [selectedPlan,  setSelectedPlan]  = useState<Plan | null>(null)
  const [convertPrompt,  setConvertPrompt]  = useState<Plan | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  useEffect(() => { fetchMemories() }, [fetchMemories])

  useEffect(() => {
    if (activeTab === 'plans') fetchPlans()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const grouped = useMemo(() => groupByMonth(memories), [memories])

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
    const uniqueLocations = new Set(
      memories.map(m => m.location?.trim()).filter((l): l is string => !!l)
    ).size

    // Загальна відстань "подорожі" — сума відрізків між хронологічно послідовними спогадами з координатами
    const withCoords = memories
      .filter(m => m.lat != null && m.lng != null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    let totalDistanceKm = 0
    for (let i = 1; i < withCoords.length; i++) {
      totalDistanceKm += haversineKm(
        { lat: withCoords[i - 1].lat!, lng: withCoords[i - 1].lng! },
        { lat: withCoords[i].lat!, lng: withCoords[i].lng! }
      )
    }

    return { count: memories.length, totalPhotos, uniqueLocations, totalDistanceKm: Math.round(totalDistanceKm) }
  }, [memories])

  const currentMonthKey = useMemo(
    () => new Date()
      .toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })
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
      coverUrl: data.coverUrl,
      notes:    data.notes,
      tags:     data.tags,
      photos:   [],
    })
    useAchievementsStore.getState().unlock('first-memory')
    setShowAdd(false)
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
    <div className={styles.screen}>
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

      {/* ── Memories tab ── */}
      {activeTab === 'memories' && (
        <>
          {memories.length === 0 ? (
            <div className={styles.empty}>
              <DoodleIllustration variant="memories" size={88} />
              <p className={styles.emptyTitle}>Ще немає спогадів</p>
              <p className={styles.emptyHint}>Додай перший!</p>
            </div>
          ) : (
            <div className={styles.timeline}>
              {/* Stats row */}
              <p className={styles.statsRow}>
                <span><b className={styles.statNum}>{stats.count}</b> спогадів</span>
                <span className={styles.statsDot}>·</span>
                <span><b className={styles.statNum}>{stats.totalPhotos}</b> фото</span>
                <span className={styles.statsDot}>·</span>
                <span><b className={styles.statNum}>{stats.uniqueLocations}</b> місць</span>
                {stats.totalDistanceKm > 0 && (
                  <>
                    <span className={styles.statsDot}>·</span>
                    <span><b className={styles.statNum}>{stats.totalDistanceKm}</b> км подорожей</span>
                  </>
                )}
              </p>

              {/* This Day banner */}
              {thisDay.length > 0 && (
                <div
                  className={styles.thisDayBanner}
                  onClick={() => navigate(`/memories/${thisDay[0].memory.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && navigate(`/memories/${thisDay[0].memory.id}`)}
                >
                  <div className={styles.thisDayIcon}>📅</div>
                  <div className={styles.thisDayContent}>
                    <p className={styles.thisDayTitle}>
                      ЦЬОГО ДНЯ {yearsAgoLabel(thisDay[0].yearsAgo)}
                    </p>
                    <p className={styles.thisDayMemory}>
                      {thisDay[0].memory.title}
                      {thisDay.length > 1 && ` та ще ${thisDay.length - 1}`}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
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
                          <div className={styles.cardPlaceholder} />
                        )}
                        <div className={styles.cardGrad} />
                        <div className={styles.cardInfo}>
                          <p className={styles.cardTitle}>{m.title}</p>
                          <p className={styles.cardDate}>
                            {new Date(m.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
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
          {plans.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>🗺️</span>
              <p className={styles.emptyTitle}>Планів ще немає</p>
              <p className={styles.emptyHint}>Додай місце яке хочеш відвідати</p>
            </div>
          ) : (
            <div className={styles.plansGrid}>
              {plans.map(p => (
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
    </div>
  )
}

export default MemoriesScreen
