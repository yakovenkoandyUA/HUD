import React, { useState } from 'react'
import { authFetch } from '../../../services/api'
import type { Recipe } from '../../../types'
import styles from './RecipeGeneratorModal.module.css'

/**
 * RecipeGeneratorModal
 * --------------------
 * Модалка AI-генерації рецепту.
 * Юзер вводить інгредієнти та обмеження → Haiku генерує рецепт
 * → onGenerated повертає попередньо заповнені дані для RecipeForm.
 *
 * Props:
 * @prop {(data: Partial<Omit<Recipe,'id'>>) => void} onGenerated — передає результат у RecipeForm
 * @prop {() => void} onCancel — закрити модалку
 */
interface RecipeGeneratorModalProps {
  onGenerated: (data: Partial<Omit<Recipe, 'id'>>) => void
  onCancel: () => void
}

const RecipeGeneratorModal: React.FC<RecipeGeneratorModalProps> = ({ onGenerated, onCancel }) => {
  const [ingredients, setIngredients] = useState('')
  const [restrictions, setRestrictions] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!ingredients.trim() || loading) return
    setLoading(true)
    setError('')

    try {
      const res = await authFetch('/api/recipes/generate', {
        method: 'POST',
        body: JSON.stringify({ ingredients: ingredients.trim(), restrictions: restrictions.trim() || undefined }),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Помилка генерації')
      }

      const data = await res.json() as {
        title: string
        ingredients: string[]
        steps: string
        cookTime: number
        servings: number
        calories: number
        difficulty: string
        category: string
      }

      onGenerated({
        title: data.title,
        ingredients: data.ingredients,
        steps: data.steps,
        cookTime: data.cookTime,
        servings: data.servings,
        calories: data.calories,
        difficulty: data.difficulty as Recipe['difficulty'],
        category: data.category,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не вдалося згенерувати, спробуй ще раз')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.field}>
        <label className={styles.label}>Що є в холодильнику?</label>
        <textarea
          className={styles.textarea}
          value={ingredients}
          onChange={e => setIngredients(e.target.value)}
          placeholder="Куряче філе, яйця, картопля, цибуля, морква..."
          rows={4}
          disabled={loading}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Обмеження (необов'язково)</label>
        <textarea
          className={styles.textarea}
          value={restrictions}
          onChange={e => setRestrictions(e.target.value)}
          placeholder="Без глютену, вегетаріанське, низькокалорійне..."
          rows={2}
          disabled={loading}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={loading}>
          Скасувати
        </button>
        <button
          type="button"
          className={styles.generateBtn}
          onClick={handleGenerate}
          disabled={!ingredients.trim() || loading}
        >
          {loading ? (
            <span className={styles.loadingRow}>
              <span className={styles.spinner} />
              Генерую...
            </span>
          ) : (
            <span className={styles.generateRow}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              Згенерувати
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

export default RecipeGeneratorModal
