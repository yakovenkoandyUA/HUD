import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'
import AddMemoryModal from '../../components/memories/AddMemoryModal'
import PlanCard from '../../components/memories/PlanCard'
import PlanForm from '../../components/memories/PlanForm'
import type { AddMemoryData } from '../../components/memories/AddMemoryModal'
import type { Memory } from '../../types/memory'
import { useMemoriesStore } from '../../store/memoriesStore'
import { usePlansStore, type Plan } from '../../store/plansStore'
import { useUiStore } from '../../store/uiStore'
import { authFetch } from '../../services/api'
import { uploadToCloudinary } from '../../utils/uploadToCloudinary'
import styles from './Memories.module.css'

type ActiveTab = 'memories' | 'plans'

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
  const [search,         setSearch]         = useState('')

  useEffect(() => { fetchMemories() }, [fetchMemories])

  useEffect(() => {
    if (activeTab === 'plans') fetchPlans()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const filteredMemories = useMemo(() =>
    search.trim()
      ? memories.filter(m => m.title.toLowerCase().includes(search.toLowerCase()))
      : memories,
    [memories, search]
  )

  const grouped = useMemo(() => groupByMonth(filteredMemories), [filteredMemories])

  const thisDay = useMemo(() => {
    const now   = new Date()
    const month = now.getMonth()
    const day   = now.getDate()
    return memories.filter(m => {
      const d = new Date(m.date)
      return d.getMonth() === month && d.getDate() === day && d.getFullYear() < now.getFullYear()
    })
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
      date:     data.date,
      coverUrl: data.coverUrl,
      photos:   [],
    })
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
          date:     new Date().toISOString(),
          notes:    plan.notes,
          photos:   plan.photos,
          location: plan.location?.name ?? '',
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
      </div>

      {/* ── Memories tab ── */}
      {activeTab === 'memories' && (
        <>
          {memories.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>📷</span>
              <p className={styles.emptyTitle}>Ще немає спогадів</p>
              <p className={styles.emptyHint}>Додай перший!</p>
            </div>
          ) : (
            <div className={styles.timeline}>
              {/* This Day banner */}
              {thisDay.length > 0 && (
                <div
                  className={styles.thisDayBanner}
                  onClick={() => navigate(`/memories/${thisDay[0].id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && navigate(`/memories/${thisDay[0].id}`)}
                >
                  <div className={styles.thisDayIcon}>📅</div>
                  <div className={styles.thisDayContent}>
                    <p className={styles.thisDayTitle}>ЦЬОГО ДНЯ РІК ТОМУ</p>
                    <p className={styles.thisDayMemory}>
                      {thisDay[0].title}
                      {thisDay.length > 1 && ` та ще ${thisDay.length - 1}`}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
              )}

              {/* Search */}
              <div className={styles.searchRow}>
                <div className={styles.searchWrap}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  <input
                    className={styles.searchInput}
                    placeholder="Пошук спогадів..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {search && (
                    <button type="button" className={styles.searchClear} onClick={() => setSearch('')}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* No results */}
              {search.trim() && filteredMemories.length === 0 && (
                <div className={styles.emptySearch}>
                  <p className={styles.emptySearchText}>
                    Нічого не знайдено по запиту «{search}»
                  </p>
                </div>
              )}

              {/* Flat grid when searching */}
              {search.trim() && filteredMemories.length > 0 && (
                <div className={styles.memoriesGrid}>
                  {filteredMemories.map(m => (
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
              )}

              {/* Grouped timeline — only when not searching */}
              {!search.trim() && grouped.map(([monthLabel, items]) => (
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
    </div>
  )
}

export default MemoriesScreen
