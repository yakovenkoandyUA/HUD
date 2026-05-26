import React, { useState, useEffect } from 'react'
import type { Recipe } from '../../../types'
import ImageUploadButton from '../../ui/ImageUploadButton'
import styles from './RecipeForm.module.css'

/**
 * RecipeForm
 * ----------
 * Форма додавання / редагування особистого рецепту.
 *
 * Props:
 * @prop {Recipe | null}                  initial  — рецепт для редагування (null = новий)
 * @prop {(data: Omit<Recipe,'id'>) => void} onSave — зберегти
 * @prop {() => void}                     onCancel — скасувати
 */
interface RecipeFormProps {
  initial?: Recipe | null
  onSave: (data: Omit<Recipe, 'id'>) => void
  onCancel: () => void
}

const RecipeForm: React.FC<RecipeFormProps> = ({ initial, onSave, onCancel }) => {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [ingredientsText, setIngredientsText] = useState(initial?.ingredients.join('\n') ?? '')
  const [steps, setSteps] = useState(initial?.steps ?? '')
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(initial?.title ?? '')
    setIngredientsText(initial?.ingredients.join('\n') ?? '')
    setSteps(initial?.steps ?? '')
    setImageUrl(initial?.imageUrl ?? '')
  }, [initial])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const ingredients = ingredientsText.split('\n').map((l) => l.trim()).filter(Boolean)
    onSave({ title: title.trim(), ingredients, steps: steps.trim(), imageUrl: imageUrl.trim() || undefined })
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label}>Назва *</label>
        <input
          className={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Борщ, паста, омлет..."
          autoFocus
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Інгредієнти <span className={styles.hint}>(кожен з нового рядка)</span></label>
        <textarea
          className={styles.textarea}
          value={ingredientsText}
          onChange={(e) => setIngredientsText(e.target.value)}
          placeholder={'200г борошна\n2 яйця\n100мл молока'}
          rows={5}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Спосіб приготування</label>
        <textarea
          className={styles.textarea}
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          placeholder="Опишіть кроки приготування..."
          rows={5}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Фото <span className={styles.hint}>(необов'язково)</span></label>
        <ImageUploadButton
          currentUrl={imageUrl || undefined}
          folder="mimir/recipes"
          onUpload={setImageUrl}
          variant="wide"
          placeholder="Додати фото рецепту"
        />
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>Скасувати</button>
        <button type="submit" className={styles.saveBtn}>
          {initial ? 'Зберегти' : 'Додати рецепт'}
        </button>
      </div>
    </form>
  )
}

export default RecipeForm
