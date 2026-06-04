import React, { useState, useEffect } from 'react'
import type { Recipe, RecipeDifficulty } from '../../../types'
import ImageUploadButton from '../../ui/ImageUploadButton'
import styles from './RecipeForm.module.css'

const DEFAULT_CATEGORIES = [
  'Сніданки', 'Супи', 'Салати', 'Основні страви', 'Гарніри',
  'Десерти', 'Випічка', 'Напої', 'Закуски', 'Інше',
]

const CATEGORY_ICONS: Record<string, string> = {
  'Сніданки':       '🌅',
  'Супи':           '🍲',
  'Салати':         '🥗',
  'Основні страви': '🍽',
  'Гарніри':        '🥦',
  'Десерти':        '🍰',
  'Випічка':        '🥐',
  'Напої':          '🥤',
  'Закуски':        '🫙',
  'Інше':           '📦',
}

const PRESET_TAGS = [
  'швидко',
  "без м'яса",
  'для сніданку',
  'для обіду',
  'для вечері',
  'десерт',
  'здорово',
  'бюджетно',
]

const DIFFICULTY_OPTIONS = [
  { value: 'easy'   as RecipeDifficulty, label: 'Легкий',   diff: 'easy'   },
  { value: 'medium' as RecipeDifficulty, label: 'Середній', diff: 'medium' },
  { value: 'hard'   as RecipeDifficulty, label: 'Важкий',   diff: 'hard'   },
]

type FormErrors = {
  title?: string
  category?: string
  ingredientsText?: string
  steps?: string
  cookTime?: string
  calories?: string
}

/**
 * RecipeForm
 * ----------
 * 2-крокова форма додавання / редагування рецепту.
 * Крок 1 — Основне (назва, фото, категорія, складність, теги)
 * Крок 2 — Деталі (час, ккал, інгредієнти, спосіб, інструменти)
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
  const [step, setStep] = useState<1 | 2>(1)

  const [title, setTitle]                   = useState(initial?.title ?? '')
  const [ingredientsText, setIngredientsText] = useState(initial?.ingredients.join('\n') ?? '')
  const [steps, setSteps]                   = useState(initial?.steps ?? '')
  const [imageUrl, setImageUrl]             = useState(initial?.imageUrl ?? '')
  const [cookTime, setCookTime]             = useState(initial?.cookTime?.toString() ?? '')
  const [calories, setCalories]             = useState(initial?.calories?.toString() ?? '')
  const [difficulty, setDifficulty]         = useState<RecipeDifficulty | ''>(initial?.difficulty ?? '')
  const [equipmentText, setEquipmentText]   = useState(initial?.equipment?.join('\n') ?? '')
  const [category, setCategory]             = useState(initial?.category ?? '')
  const [tags, setTags]                     = useState<string[]>(initial?.tags ?? [])
  const [customTag, setCustomTag]           = useState('')
  const [errors, setErrors]                 = useState<FormErrors>({})

  useEffect(() => {
    setStep(1)
    setTitle(initial?.title ?? '')
    setIngredientsText(initial?.ingredients.join('\n') ?? '')
    setSteps(initial?.steps ?? '')
    setImageUrl(initial?.imageUrl ?? '')
    setCookTime(initial?.cookTime?.toString() ?? '')
    setCalories(initial?.calories?.toString() ?? '')
    setDifficulty(initial?.difficulty ?? '')
    setEquipmentText(initial?.equipment?.join('\n') ?? '')
    setCategory(initial?.category ?? '')
    setTags(initial?.tags ?? [])
    setCustomTag('')
    setErrors({})
  }, [initial])

  const goToStep2 = () => {
    const errs: FormErrors = {}
    if (!title.trim()) errs.title = 'Введи назву рецепту'
    if (!category) errs.category = 'Вибери категорію'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setStep(2)
  }

  const handleSubmit = () => {
    const errs: FormErrors = {}
    if (!ingredientsText.trim()) errs.ingredientsText = 'Введіть інгредієнти'
    if (!steps.trim()) errs.steps = 'Опишіть спосіб приготування'
    if (cookTime && (isNaN(parseInt(cookTime)) || parseInt(cookTime) < 1)) errs.cookTime = 'Введіть ціле число > 0'
    if (calories && (isNaN(parseInt(calories)) || parseInt(calories) < 0)) errs.calories = 'Введіть ціле число ≥ 0'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    const ingredients = ingredientsText.split('\n').map(l => l.trim()).filter(Boolean)
    const equipment = equipmentText.split('\n').map(l => l.trim()).filter(Boolean)
    onSave({
      title:      title.trim(),
      ingredients,
      steps:      steps.trim(),
      imageUrl:   imageUrl.trim() || undefined,
      cookTime:   cookTime ? parseInt(cookTime) : undefined,
      calories:   calories ? parseInt(calories) : undefined,
      difficulty: difficulty || undefined,
      equipment:  equipment.length ? equipment : undefined,
      category:   category.trim() || undefined,
      tags:       tags.length ? tags : undefined,
    })
  }

  const addCustomTag = () => {
    const t = customTag.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setCustomTag('')
  }

  return (
    <div className={styles.form}>

      {/* ── Step indicator ── */}
      <div className={styles.stepIndicator}>
        <div className={`${styles.stepDot} ${step >= 1 ? styles.stepDotActive : ''}`} />
        <div className={styles.stepLine} />
        <div className={`${styles.stepDot} ${step >= 2 ? styles.stepDotActive : ''}`} />
      </div>

      {/* ── Step 1 — Основне ── */}
      {step === 1 && (
        <>
          <div className={styles.field}>
            <label className={styles.label}>Назва *</label>
            <input
              className={`${styles.input} ${errors.title ? 'inputError' : ''}`}
              value={title}
              onChange={e => {
                setTitle(e.target.value)
                if (errors.title && e.target.value.trim()) setErrors(prev => ({ ...prev, title: undefined }))
              }}
              placeholder="Борщ, паста, омлет..."
              autoFocus
            />
            {errors.title && <span className="errorMsg">{errors.title}</span>}
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
            <label className={styles.label}>Категорія *</label>
            <div className={`${styles.catGrid} ${errors.category ? styles.catGridError : ''}`}>
              {DEFAULT_CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.catBtn} ${category === c ? styles.catBtnActive : ''}`}
                  onClick={() => {
                    setCategory(category === c ? '' : c)
                    if (errors.category) setErrors(prev => ({ ...prev, category: undefined }))
                  }}
                >
                  <span className={styles.catIcon}>{CATEGORY_ICONS[c]}</span>
                  {c}
                </button>
              ))}
            </div>
            {errors.category && <span className="errorMsg">{errors.category}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Складність</label>
            <div className={styles.diffPicker}>
              {DIFFICULTY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  data-active={difficulty === opt.value ? 'true' : undefined}
                  data-diff={opt.diff}
                  className={styles.diffBtn}
                  onClick={() => setDifficulty(difficulty === opt.value ? '' : opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Теги <span className={styles.hint}>(необов'язково)</span></label>
            <div className={styles.catGrid}>
              {PRESET_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={`${styles.catBtn} ${tags.includes(tag) ? styles.catBtnActive : ''}`}
                  onClick={() => setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className={styles.tagInputRow}>
              <input
                className={styles.input}
                value={customTag}
                onChange={e => setCustomTag(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
                placeholder="Свій тег..."
              />
              {customTag.trim() && (
                <button type="button" className={styles.tagAddBtn} onClick={addCustomTag}>+</button>
              )}
            </div>
            {tags.filter(t => !PRESET_TAGS.includes(t)).length > 0 && (
              <div className={styles.catGrid}>
                {tags.filter(t => !PRESET_TAGS.includes(t)).map(tag => (
                  <button
                    key={tag}
                    type="button"
                    className={`${styles.catBtn} ${styles.catBtnActive}`}
                    onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                  >
                    {tag} ×
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.stepFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onCancel}>Скасувати</button>
            <button type="button" className={styles.saveBtn} onClick={goToStep2}>Далі →</button>
          </div>
        </>
      )}

      {/* ── Step 2 — Деталі ── */}
      {step === 2 && (
        <>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Час <span className={styles.hint}>хв</span></label>
              <input
                className={`${styles.input} ${errors.cookTime ? 'inputError' : ''}`}
                type="number"
                value={cookTime}
                onChange={e => {
                  setCookTime(e.target.value)
                  if (errors.cookTime) {
                    const v = parseInt(e.target.value)
                    if (!e.target.value || v >= 1) setErrors(prev => ({ ...prev, cookTime: undefined }))
                  }
                }}
                placeholder="30"
              />
              {errors.cookTime && <span className="errorMsg">{errors.cookTime}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Ккал <span className={styles.hint}>/100г</span></label>
              <input
                className={`${styles.input} ${errors.calories ? 'inputError' : ''}`}
                type="number"
                value={calories}
                onChange={e => {
                  setCalories(e.target.value)
                  if (errors.calories) {
                    const v = parseInt(e.target.value)
                    if (!e.target.value || v >= 0) setErrors(prev => ({ ...prev, calories: undefined }))
                  }
                }}
                placeholder="350"
              />
              {errors.calories && <span className="errorMsg">{errors.calories}</span>}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Інгредієнти * <span className={styles.hint}>(кожен з нового рядка)</span></label>
            <textarea
              className={`${styles.textarea} ${errors.ingredientsText ? 'inputError' : ''}`}
              value={ingredientsText}
              onChange={e => {
                setIngredientsText(e.target.value)
                if (errors.ingredientsText && e.target.value.trim()) setErrors(prev => ({ ...prev, ingredientsText: undefined }))
              }}
              placeholder={'200г борошна\n2 яйця\n100мл молока'}
              rows={5}
            />
            {errors.ingredientsText && <span className="errorMsg">{errors.ingredientsText}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Спосіб приготування *</label>
            <textarea
              className={`${styles.textarea} ${errors.steps ? 'inputError' : ''}`}
              value={steps}
              onChange={e => {
                setSteps(e.target.value)
                if (errors.steps && e.target.value.trim()) setErrors(prev => ({ ...prev, steps: undefined }))
              }}
              placeholder="Опишіть кроки приготування..."
              rows={5}
            />
            {errors.steps && <span className="errorMsg">{errors.steps}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Інструменти <span className={styles.hint}>(необов'язково)</span></label>
            <textarea
              className={styles.textarea}
              value={equipmentText}
              onChange={e => setEquipmentText(e.target.value)}
              placeholder={"🍳 Сковорода\n🥣 Миска\n🔪 Ніж (необов'язково)"}
              rows={3}
            />
          </div>

          <div className={styles.stepFooter}>
            <button type="button" className={styles.cancelBtn} onClick={() => { setStep(1); setErrors({}) }}>← Назад</button>
            <button type="button" className={styles.saveBtn} onClick={handleSubmit}>
              {initial ? 'Зберегти' : 'Додати рецепт'}
            </button>
          </div>
        </>
      )}

    </div>
  )
}

export default RecipeForm
