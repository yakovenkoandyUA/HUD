import React, { useState, useEffect } from 'react'
import type { Recipe, RecipeDifficulty } from '../../../types'
import ImageUploadButton from '../../ui/ImageUploadButton'
import styles from './RecipeForm.module.css'

const DEFAULT_CATEGORIES = [
  'Сніданки', 'Супи', 'Салати', 'Основні страви', 'Гарніри',
  'Десерти', 'Випічка', 'Напої', 'Закуски', 'Інше',
]

/**
 * RecipeForm
 * ----------
 * Форма додавання / редагування особистого рецепту.
 *
 * Props:
 * @prop {Recipe | null}                    initial  — рецепт для редагування (null = новий)
 * @prop {(data: Omit<Recipe,'id'>) => void} onSave  — зберегти
 * @prop {() => void}                       onCancel — скасувати
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
  const [cookTime, setCookTime] = useState(initial?.cookTime?.toString() ?? '')
  const [servings, setServings] = useState(initial?.servings?.toString() ?? '')
  const [calories, setCalories] = useState(initial?.calories?.toString() ?? '')
  const [difficulty, setDifficulty] = useState<RecipeDifficulty | ''>(initial?.difficulty ?? '')
  const [equipmentText, setEquipmentText] = useState(initial?.equipment?.join('\n') ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')

  useEffect(() => {
    setTitle(initial?.title ?? '')
    setIngredientsText(initial?.ingredients.join('\n') ?? '')
    setSteps(initial?.steps ?? '')
    setImageUrl(initial?.imageUrl ?? '')
    setCookTime(initial?.cookTime?.toString() ?? '')
    setServings(initial?.servings?.toString() ?? '')
    setCalories(initial?.calories?.toString() ?? '')
    setDifficulty(initial?.difficulty ?? '')
    setEquipmentText(initial?.equipment?.join('\n') ?? '')
    setCategory(initial?.category ?? '')
  }, [initial])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const ingredients = ingredientsText.split('\n').map(l => l.trim()).filter(Boolean)
    const equipment = equipmentText.split('\n').map(l => l.trim()).filter(Boolean)
    onSave({
      title:      title.trim(),
      ingredients,
      steps:      steps.trim(),
      imageUrl:   imageUrl.trim() || undefined,
      cookTime:   cookTime ? parseInt(cookTime) : undefined,
      servings:   servings ? parseInt(servings) : undefined,
      calories:   calories ? parseInt(calories) : undefined,
      difficulty: difficulty || undefined,
      equipment:  equipment.length ? equipment : undefined,
      category:   category.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label}>Назва *</label>
        <input
          className={styles.input}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Борщ, паста, омлет..."
          autoFocus
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

      <div className={styles.field}>
        <label className={styles.label}>Категорія</label>
        <select
          className={styles.input}
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          <option value="">— оберіть категорію —</option>
          {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Час <span className={styles.hint}>хв</span></label>
          <input
            className={styles.input}
            type="number"
            min="1"
            value={cookTime}
            onChange={e => setCookTime(e.target.value)}
            placeholder="30"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Порцій</label>
          <input
            className={styles.input}
            type="number"
            min="1"
            value={servings}
            onChange={e => setServings(e.target.value)}
            placeholder="2"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Ккал <span className={styles.hint}>/100г</span></label>
          <input
            className={styles.input}
            type="number"
            min="0"
            value={calories}
            onChange={e => setCalories(e.target.value)}
            placeholder="350"
          />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Складність</label>
        <select
          className={styles.input}
          value={difficulty}
          onChange={e => setDifficulty(e.target.value as RecipeDifficulty | '')}
        >
          <option value="">— не вказано —</option>
          <option value="easy">Легкий</option>
          <option value="medium">Середній</option>
          <option value="hard">Важкий</option>
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Інгредієнти <span className={styles.hint}>(кожен з нового рядка)</span></label>
        <textarea
          className={styles.textarea}
          value={ingredientsText}
          onChange={e => setIngredientsText(e.target.value)}
          placeholder={'200г борошна\n2 яйця\n100мл молока'}
          rows={5}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Спосіб приготування</label>
        <textarea
          className={styles.textarea}
          value={steps}
          onChange={e => setSteps(e.target.value)}
          placeholder="Опишіть кроки приготування..."
          rows={5}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Інструменти <span className={styles.hint}>(emoji + назва, кожен з рядка)</span></label>
        <textarea
          className={styles.textarea}
          value={equipmentText}
          onChange={e => setEquipmentText(e.target.value)}
          placeholder={'🍳 Сковорода\n🥣 Миска\n🔪 Ніж'}
          rows={3}
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
