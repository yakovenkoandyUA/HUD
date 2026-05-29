import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../../components/layout/TopBar'
import MemoryCard from '../../components/memories/MemoryCard'
import AddMemoryModal from '../../components/memories/AddMemoryModal'
import type { AddMemoryData } from '../../components/memories/AddMemoryModal'
import { useMemoriesStore } from '../../store/memoriesStore'
import styles from './Memories.module.css'


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
      <TopBar />


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
    </div>
  )
}

export default MemoriesScreen
