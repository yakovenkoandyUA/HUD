import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../../components/layout/TopBar'
import MemoryCard from '../../components/memories/MemoryCard'
import AddMemoryModal from '../../components/memories/AddMemoryModal'
import type { AddMemoryData } from '../../components/memories/AddMemoryModal'
import { useMemoriesStore } from '../../store/memoriesStore'
import styles from './Memories.module.css'

const PlusIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <line x1="10" y1="3" x2="10" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

/**
 * MemoriesScreen
 * --------------
 * Головна сторінка Спогадів — список подій у 2-колонковому grid.
 * Дозволяє створювати нові події через модалку.
 */
const MemoriesScreen: React.FC = () => {
  const navigate    = useNavigate()
  const { memories, fetchMemories, addMemory } = useMemoriesStore()
  const [showAdd, setShowAdd]   = useState(false)

  useEffect(() => { fetchMemories() }, [fetchMemories])

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

  return (
    <div className={styles.screen}>
      <TopBar
        right={
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => setShowAdd(true)}
            aria-label="Додати спогад"
          >
            <PlusIcon />
          </button>
        }
      />

      <h1 className={styles.pageTitle}>СПОГАДИ</h1>

      {memories.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📷</span>
          <p className={styles.emptyTitle}>Спогадів ще немає</p>
          <p className={styles.emptyHint}>Додай свою першу подію</p>
          <button
            type="button"
            className={styles.emptyBtn}
            onClick={() => setShowAdd(true)}
          >
            + ДОДАТИ ПОДІЮ
          </button>
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

      <AddMemoryModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onCreate={handleCreate}
      />
    </div>
  )
}

export default MemoriesScreen
