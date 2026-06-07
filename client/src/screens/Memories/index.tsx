import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'
import MemoryCard from '../../components/memories/MemoryCard'
import AddMemoryModal from '../../components/memories/AddMemoryModal'
import PlanCard from '../../components/memories/PlanCard'
import PlanForm from '../../components/memories/PlanForm'
import type { AddMemoryData } from '../../components/memories/AddMemoryModal'
import { useMemoriesStore } from '../../store/memoriesStore'
import { usePlansStore, type Plan } from '../../store/plansStore'
import { useUiStore } from '../../store/uiStore'
import { authFetch } from '../../services/api'
import styles from './Memories.module.css'

type ActiveTab = 'memories' | 'plans'

/**
 * MemoriesScreen
 * --------------
 * Two-tab screen: СПОГАДИ (memory grid) + ПЛАНИ (places to visit / visited).
 * Plans tab supports create, status change, convert visited → memory.
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
  const [convertPrompt, setConvertPrompt] = useState<Plan | null>(null)

  useEffect(() => { fetchMemories() }, [fetchMemories])

  useEffect(() => {
    if (activeTab === 'plans') fetchPlans()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

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
    updatePlan(plan._id, {
      status:      'visited',
      visitedDate: new Date().toISOString(),
    })
    setConvertPrompt(plan)
    setSelectedPlan(null)
  }

  const handleCreateMemory = async (plan: Plan) => {
    try {
      const r = await authFetch('/api/memories', {
        method: 'POST',
        body: JSON.stringify({
          title:   plan.title,
          date:    new Date().toISOString(),
          notes:   plan.notes,
          photos:  plan.photos,
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
              <p className={styles.emptyTitle}>Спогадів ще немає</p>
              <p className={styles.emptyHint}>Додай свою першу подію</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {memories.map(m => (
                <MemoryCard
                  key={m.id}
                  memory={m}
                  onClick={() => navigate(`/memories/${m.id}`)}
                />
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
            <div className={styles.grid}>
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

            <div className={styles.planActions}>
              {selectedPlan.status !== 'visited' && (
                <button
                  type="button"
                  className={styles.visitedBtn}
                  onClick={() => handleVisited(selectedPlan)}
                >
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
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={() => handleDeletePlan(selectedPlan)}
              >
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
              <button
                type="button"
                className={styles.convertYes}
                onClick={() => handleCreateMemory(convertPrompt)}
              >
                Так, створити
              </button>
              <button
                type="button"
                className={styles.convertNo}
                onClick={() => setConvertPrompt(null)}
              >
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
