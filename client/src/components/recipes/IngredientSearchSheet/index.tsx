import React, { useState, useRef, useMemo } from 'react'
import { useSwipeToDismiss } from '../../../hooks/useSwipeToDismiss'
import type { Recipe } from '../../../types'
import { normalizeIngredient } from '../../../utils/normalizeIngredient'
import styles from './IngredientSearchSheet.module.css'

/**
 * IngredientSearchSheet
 * ----------------------
 * Bottom sheet «Що є вдома?» — фільтрує рецепти по інгредієнтах.
 * Вводиш інгредієнт → він додається як chip → показуються рецепти де він є.
 *
 * Props:
 * @prop {Recipe[]}  recipes   — повний список рецептів для пошуку
 * @prop {boolean}   isOpen    — відкрито/закрито
 * @prop {Function}  onClose   — закрити sheet
 * @prop {Function}  onSelect  — вибрати рецепт (navigate до нього)
 */
interface IngredientSearchSheetProps {
  recipes: Recipe[]
  isOpen: boolean
  onClose: () => void
  onSelect: (recipeId: string) => void
}

const IngredientSearchSheet: React.FC<IngredientSearchSheetProps> = ({
  recipes, isOpen, onClose, onSelect,
}) => {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const sheetRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef })

  // All unique ingredients from all recipes
  const allIngredients = useMemo(() => {
    const set = new Set<string>()
    recipes.forEach(r => (r.ingredients ?? []).forEach(raw => {
      const name = normalizeIngredient(raw).name
      if (name) set.add(name.toLowerCase().trim())
    }))
    return [...set].sort()
  }, [recipes])

  const suggestions = query.length >= 2
    ? allIngredients.filter(i => i.includes(query.toLowerCase()) && !selected.includes(i))
    : []

  const addIngredient = (ing: string) => {
    const normalized = ing.toLowerCase().trim()
    if (!normalized || selected.includes(normalized)) return
    setSelected(s => [...s, normalized])
    setQuery('')
  }

  const removeIngredient = (ing: string) => setSelected(s => s.filter(i => i !== ing))

  const matchedRecipes = selected.length === 0
    ? []
    : recipes.filter(r =>
        selected.every(sel =>
          (r.ingredients ?? []).some(raw => normalizeIngredient(raw).name.toLowerCase().includes(sel))
        )
      )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      addIngredient(query.trim())
    }
    if (e.key === 'Backspace' && !query && selected.length > 0) {
      setSelected(s => s.slice(0, -1))
    }
  }

  if (!isOpen) return null

  return (
    <div ref={overlayRef} className={styles.overlay} onClick={onClose}>
      <div
        ref={sheetRef}
        className={styles.sheet}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.handle} />
        <h2 className={styles.title}>ЩО Є ВДОМА?</h2>

        {/* ── Input ── */}
        <div className={styles.inputWrap}>
          {selected.map(ing => (
            <span key={ing} className={styles.chip}>
              {ing}
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => removeIngredient(ing)}
                aria-label={`Прибрати ${ing}`}
              >
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            className={styles.input}
            placeholder={selected.length === 0 ? 'Картопля, гриби, курка...' : ''}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        {/* ── Suggestions ── */}
        {suggestions.length > 0 && (
          <div className={styles.suggestions}>
            {suggestions.slice(0, 8).map(s => (
              <button
                key={s}
                type="button"
                className={styles.suggestion}
                onClick={() => addIngredient(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Results ── */}
        <div ref={bodyRef} className={styles.results}>
          {selected.length === 0 && (
            <p className={styles.hint}>Введи інгредієнти які є вдома — покажемо що можна приготувати</p>
          )}
          {selected.length > 0 && matchedRecipes.length === 0 && (
            <p className={styles.hint}>Нічого не знайдено з цими інгредієнтами</p>
          )}
          {matchedRecipes.map(r => (
            <button
              key={r.id}
              type="button"
              className={styles.resultCard}
              onClick={() => { onSelect(r.id); onClose() }}
            >
              {r.imageUrl && (
                <img src={r.imageUrl} alt={r.title} className={styles.resultImg} />
              )}
              <div className={styles.resultInfo}>
                <span className={styles.resultTitle}>{r.title}</span>
                {r.category && <span className={styles.resultCategory}>{r.category}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default IngredientSearchSheet
