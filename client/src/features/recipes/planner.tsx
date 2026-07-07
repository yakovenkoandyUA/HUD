import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMealPlanStore } from '@/features/recipes/store/mealPlanStore'
import { useRecipesStore } from '@/features/recipes/store/recipesStore'
import { useSprintStore } from '@/features/sprint/store/sprintStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import type { Recipe } from '@/shared/types'
import styles from './MealPlanner.module.css'

/**
 * MealPlannerScreen
 * -----------------
 * Тижневий планер страв: призначай рецепти на дні тижня,
 * потім одним тапом генеруй список покупок.
 *
 * Props: none — дані з mealPlanStore + recipesStore
 */

const DAYS_UK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
const DAYS_FULL_UK = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця', 'Субота', 'Неділя']

function getWeekDays(): Date[] {
  const today = new Date()
  const dow = today.getDay() === 0 ? 7 : today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function toDayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function isToday(d: Date): boolean {
  return toDayKey(d) === toDayKey(new Date())
}

const BackIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M11 14L6 9l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const TrashIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2.5 4h11M6 4V2.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V4M4 4l.9 9h6.2L12 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CartIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 4h10l-1.5 7H4.5L3 4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M5.5 4V3a2.5 2.5 0 0 1 5 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="6" cy="13" r="1" fill="currentColor"/>
    <circle cx="10" cy="13" r="1" fill="currentColor"/>
  </svg>
)

interface RecipePickerProps {
  recipes: Recipe[]
  dayLabel: string
  assignedIds: string[]
  onClose: () => void
  onPick: (recipe: Recipe) => void
}

const RecipePicker: React.FC<RecipePickerProps> = ({ recipes, dayLabel, assignedIds, onClose, onPick }) => {
  const [query, setQuery] = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  const sheetRef = useSwipeToDismiss(onClose, { enabled: true, bodyRef, overlayRef })

  const filtered = recipes.filter(r =>
    r.title.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className={styles.pickerOverlay} ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose() }}>
      <div className={styles.pickerSheet} ref={sheetRef}>
        <div className={styles.pickerDragHandle} />
        <p className={styles.pickerTitle}>{dayLabel}</p>
        <div className={styles.pickerSearch}>
          <input
            className={styles.pickerInput}
            placeholder="Пошук рецептів…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className={styles.pickerList} ref={bodyRef}>
          {filtered.length === 0 && (
            <p className={styles.pickerEmpty}>Нічого не знайдено</p>
          )}
          {filtered.map(r => (
            <button
              key={r.id}
              type="button"
              className={`${styles.pickerItem} ${assignedIds.includes(r.id) ? styles.pickerItemAssigned : ''}`}
              onClick={() => onPick(r)}
            >
              {r.imageUrl ? (
                <img src={r.imageUrl} alt={r.title} className={styles.pickerThumb} />
              ) : (
                <div className={styles.pickerThumbPlaceholder} />
              )}
              <div className={styles.pickerItemInfo}>
                <span className={styles.pickerItemTitle}>{r.title}</span>
                {r.category && <span className={styles.pickerItemMeta}>{r.category}</span>}
              </div>
              {assignedIds.includes(r.id) && <span className={styles.pickerCheck}>✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const MealPlannerScreen: React.FC = () => {
  const navigate = useNavigate()
  const { plan, fetchPlan, addToDay, removeFromDay, clearWeek, copyWeekToNext } = useMealPlanStore()
  const { recipes, fetchRecipes } = useRecipesStore()
  const { addItems } = useSprintStore()
  const { showToast } = useUiStore()

  const [pickerDay, setPickerDay]       = useState<{ key: string; label: string } | null>(null)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())

  const toggleExpanded = (key: string) =>
    setExpandedDays(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const weekDays = getWeekDays()
  const weekKeys = weekDays.map(toDayKey)

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      await Promise.all([
        fetchPlan(),
        recipes.length === 0 ? fetchRecipes() : Promise.resolve(),
      ])
    }
    if (!cancelled) load()
    return () => { cancelled = true }
  }, [fetchPlan, fetchRecipes, recipes.length])

  const totalPlanned = weekKeys.reduce((acc, k) => {
    const ids = plan[k] ?? []
    return acc + ids.filter(id => recipes.some(r => r.id === id)).length
  }, 0)

const handleCopyWeek = async () => {
    await copyWeekToNext(weekKeys)
    showToast('План скопійовано на наступний тиждень', 'success')
  }

  const handleGenerateShopping = () => {
    const tasks: Parameters<typeof addItems>[0] = []
    for (const key of weekKeys) {
      const ids = plan[key] ?? []
      for (const id of ids) {
        const r = recipes.find(rec => rec.id === id)
        if (r) {
          tasks.push({
            type:     'shopping',
            title:    r.title,
            priority: 'normal',
            dueDate:  key,
          })
        }
      }
    }
    if (tasks.length === 0) {
      showToast('Немає рецептів для генерації', 'error')
      return
    }
    addItems(tasks)
    showToast(`${tasks.length} рецептів додано до покупок`, 'success')
    navigate('/sprint', { state: { filterType: 'shopping' } })
  }

  const pickerAssignedIds = pickerDay ? (plan[pickerDay.key] ?? []) : []

  const handlePick = (recipe: Recipe) => {
    if (!pickerDay) return
    addToDay(pickerDay.key, recipe.id)
    setPickerDay(null)
  }

  return (
    <div className={styles.screen}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/recipes')}>
          <BackIcon />
        </button>
        <span className={styles.headerTitle}>ПЛАНЕР</span>
        {totalPlanned > 0 && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => clearWeek(weekKeys)}
          >
            Очистити
          </button>
        )}
      </div>

      {/* ── Week days ── */}
      <div className={styles.dayList}>
        {weekDays.map((day, i) => {
          const key = toDayKey(day)
          const ids = plan[key] ?? []
          const dayRecipes = ids.map(id => recipes.find(r => r.id === id)).filter(Boolean) as Recipe[]

          return (
            <div key={key} className={`${styles.dayRow} ${isToday(day) ? styles.dayRowToday : ''}`}>
              <div className={styles.dayLabel}>
                <span className={styles.dayShort}>{DAYS_UK[i]}</span>
                <span className={`${styles.dayNum} ${isToday(day) ? styles.dayNumToday : ''}`}>
                  {day.getDate()}
                </span>
              </div>

              <div className={styles.daySlots}>
                {(expandedDays.has(key) ? dayRecipes : dayRecipes.slice(0, 2)).map(r => (
                  <div key={r.id} className={styles.slot}>
                    {r.imageUrl ? (
                      <img src={r.imageUrl} alt={r.title} className={styles.slotThumb} />
                    ) : (
                      <div className={styles.slotThumbPlaceholder} />
                    )}
                    <span className={styles.slotTitle}>{r.title}</span>
                    <button
                      type="button"
                      className={styles.slotRemoveBtn}
                      onClick={() => removeFromDay(key, r.id)}
                      aria-label="Прибрати"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
                {dayRecipes.length > 2 && (
                  <button
                    type="button"
                    className={styles.showMoreBtn}
                    onClick={() => toggleExpanded(key)}
                  >
                    {expandedDays.has(key)
                      ? 'Сховати'
                      : `+${dayRecipes.length - 2} ще`}
                  </button>
                )}

                <button
                  type="button"
                  className={styles.addSlotBtn}
                  onClick={() => setPickerDay({ key, label: `${DAYS_FULL_UK[i]}, ${day.getDate()}` })}
                  aria-label="Додати страву"
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8h12M8 2v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  <span>{dayRecipes.length > 0 ? 'Ще' : 'Додати'}</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Actions ── */}
      {totalPlanned > 0 && (
        <div className={styles.generateWrap}>
          {/* Buttons */}
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.copyBtn}
              onClick={handleCopyWeek}
              title="Повторити цей тиждень наступного"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
              Наступний тиждень
            </button>
            <button
              type="button"
              className={styles.generateBtn}
              onClick={handleGenerateShopping}
            >
              <CartIcon />
              Покупки ({totalPlanned})
            </button>
          </div>
        </div>
      )}

      {/* ── Recipe picker sheet ── */}
      {pickerDay !== null && (
        <RecipePicker
          recipes={recipes}
          dayLabel={pickerDay.label}
          assignedIds={pickerAssignedIds}
          onClose={() => setPickerDay(null)}
          onPick={handlePick}
        />
      )}
    </div>
  )
}

export default MealPlannerScreen
