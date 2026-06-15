import React, { useState, useEffect } from 'react'
import type { Recipe, RecipeDifficulty, IngredientItem } from '../../../types'
import { normalizeIngredient } from '../../../utils/normalizeIngredient'
import ImageUploadButton from '../../ui/ImageUploadButton'
import IngredientIcon from '../../ui/IngredientIcon'
import UnitPicker from '../../ui/UnitPicker'
import styles from './RecipeForm.module.css'

const UNITS = ['г', 'кг', 'мл', 'л', 'шт', 'ч.л.', 'ст.л.']

const METHOD_OPTIONS: { id: string; icon: string }[] = [
  { id: 'Смаження',           icon: '🍳' },
  { id: 'Варіння',            icon: '🫧' },
  { id: 'Тушкування',         icon: '🫕' },
  { id: 'Запікання',          icon: '🔥' },
  { id: 'Гриль',              icon: '🥩' },
  { id: 'На парі',            icon: '💨' },
  { id: 'Без термообробки',   icon: '🥗' },
  { id: 'Заморожування',      icon: '🧊' },
]

const emptyIngredient = (): IngredientItem => ({ name: '', amount: '', unit: 'г' })

const DEFAULT_CATEGORIES = [
  'Супи', 'Салати', 'Основні страви', 'Гарніри',
  'Паста', 'М\'ясо', 'Риба', 'Закуски',
  'Десерти', 'Випічка', 'Напої', 'Інше',
]

const NOTO = 'https://fonts.gstatic.com/s/e/notoemoji/latest'

const CATEGORY_ICONS: Record<string, string> = {
  'Супи':           `${NOTO}/1f372/emoji.svg`, // 🍲
  'Салати':         `${NOTO}/1f957/emoji.svg`, // 🥗
  'Основні страви': `${NOTO}/1f958/emoji.svg`, // 🥘
  'Гарніри':        `${NOTO}/1f35a/emoji.svg`, // 🍚
  'Паста':          `${NOTO}/1f35d/emoji.svg`, // 🍝
  'М\'ясо':         `${NOTO}/1f969/emoji.svg`, // 🥩
  'Риба':           `${NOTO}/1f41f/emoji.svg`, // 🐟
  'Закуски':        `${NOTO}/1fad4/emoji.svg`, // 🫔 тамале
  'Десерти':        `${NOTO}/1f370/emoji.svg`, // 🍰
  'Випічка':        `${NOTO}/1f950/emoji.svg`, // 🥐
  'Напої':          `${NOTO}/1f964/emoji.svg`, // 🥤
  'Інше':           `${NOTO}/1f4e6/emoji.svg`, // 📦
}

const DIFFICULTY_OPTIONS = [
  { value: 'easy'   as RecipeDifficulty, label: 'Легкий',   diff: 'easy'   },
  { value: 'medium' as RecipeDifficulty, label: 'Середній', diff: 'medium' },
  { value: 'hard'   as RecipeDifficulty, label: 'Важкий',   diff: 'hard'   },
]

type FormErrors = {
  title?: string
  category?: string
  ingredientsText?: string
  ingredientRows?: Record<number, string>
  instructions?: string
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
  const [ingredientRows, setIngredientRows] = useState<IngredientItem[]>(
    initial?.ingredients.length
      ? initial.ingredients.map(normalizeIngredient)
      : [emptyIngredient()]
  )
  const initInstructions = (): string[] => {
    if (initial?.instructions?.length) return initial.instructions
    if (initial?.steps?.trim()) return initial.steps.split('\n').map(l => l.trim()).filter(Boolean)
    return ['']
  }
  const [instructions, setInstructions] = useState<string[]>(initInstructions)
  const [imageUrl, setImageUrl]             = useState(initial?.imageUrl ?? '')
  const [cookTime, setCookTime]             = useState(initial?.cookTime?.toString() ?? '')
  const [calories, setCalories]             = useState(initial?.calories?.toString() ?? '')
  const [difficulty, setDifficulty]         = useState<RecipeDifficulty | ''>(initial?.difficulty ?? '')
  const [cookingMethod, setCookingMethod]   = useState<string[]>(initial?.cookingMethod ?? [])
  const [category, setCategory]             = useState(initial?.category ?? '')
  const [errors, setErrors]                 = useState<FormErrors>({})

  useEffect(() => {
    setStep(1)
    setTitle(initial?.title ?? '')
    setIngredientRows(
      initial?.ingredients.length
        ? initial.ingredients.map(normalizeIngredient)
        : [emptyIngredient()]
    )
    setInstructions(
      initial?.instructions?.length
        ? initial.instructions
        : initial?.steps?.trim()
          ? initial.steps.split('\n').map(l => l.trim()).filter(Boolean)
          : ['']
    )
    setImageUrl(initial?.imageUrl ?? '')
    setCookTime(initial?.cookTime?.toString() ?? '')
    setCalories(initial?.calories?.toString() ?? '')
    setDifficulty(initial?.difficulty ?? '')
    setCookingMethod(initial?.cookingMethod ?? [])
    setCategory(initial?.category ?? '')
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
    if (!ingredientRows.some(r => r.name.trim())) errs.ingredientsText = 'Введіть інгредієнти'
    const rowErrs: Record<number, string> = {}
    ingredientRows.forEach((r, i) => {
      if (r.name.trim() && !r.amount.trim()) rowErrs[i] = 'Вкажи кількість'
    })
    if (Object.keys(rowErrs).length) errs.ingredientRows = rowErrs
    if (!instructions.some(s => s.trim())) errs.instructions = 'Додайте хоча б один крок'
    if (cookTime && (isNaN(parseInt(cookTime)) || parseInt(cookTime) < 1)) errs.cookTime = 'Введіть ціле число > 0'
    if (calories && (isNaN(parseInt(calories)) || parseInt(calories) < 0)) errs.calories = 'Введіть ціле число ≥ 0'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    const ingredients = ingredientRows.filter(r => r.name.trim())
    const cleanInstructions = instructions.map(s => s.trim()).filter(Boolean)
    onSave({
      title:         title.trim(),
      ingredients,
      steps:         cleanInstructions.join('\n'),
      instructions:  cleanInstructions,
      imageUrl:      imageUrl.trim() || undefined,
      cookTime:      cookTime ? parseInt(cookTime) : undefined,
      calories:      calories ? parseInt(calories) : undefined,
      difficulty:    difficulty || undefined,
      cookingMethod: cookingMethod.length ? cookingMethod : undefined,
      category:      category.trim() || undefined,
      tags:          initial?.tags?.length ? initial.tags : undefined,
    })
  }

  return (
    <div className={styles.form}>

      {/* ── Step indicator + close ── */}
      <div className={styles.stepIndicatorRow}>
        <div className={styles.stepIndicator}>
          <span className={`${styles.stepLabel} ${step === 1 ? styles.stepLabelActive : ''}`}>ОСНОВНЕ</span>
          <div className={styles.stepDot} />
          <div className={styles.stepLine}>
            <div className={`${styles.stepLineFill} ${step === 2 ? styles.stepLineFillActive : ''}`} />
          </div>
          <div className={`${styles.stepDot} ${step >= 2 ? styles.stepDotActive : ''}`} />
          <span className={`${styles.stepLabel} ${step === 2 ? styles.stepLabelActive : ''}`}>ДЕТАЛІ</span>
        </div>
        <button type="button" className={styles.closeBtn} onClick={onCancel} aria-label="Закрити">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
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
              variant="compact"
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
                  <img
                    src={CATEGORY_ICONS[c]}
                    alt=""
                    width={28}
                    height={28}
                    className={styles.catIcon}
                    loading="lazy"
                    draggable={false}
                  />
                  {c}
                </button>
              ))}
            </div>
            {errors.category && <span className="errorMsg">{errors.category}</span>}
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
            <label className={styles.label}>Інгредієнти *</label>
            <div className={styles.stepsList}>
              {ingredientRows.map((row, i) => (
                <div key={i} className={`${styles.ingredientRow} ${errors.ingredientRows?.[i] ? styles.ingredientRowError : ''}`}>
                  <IngredientIcon ingredient={row.name} size={32} />
                  <input
                    className={`${styles.ingredientInput} ${errors.ingredientsText && !row.name.trim() ? 'inputError' : ''}`}
                    value={row.name}
                    placeholder="Назва"
                    onChange={e => {
                      const next = [...ingredientRows]
                      next[i] = { ...next[i], name: e.target.value }
                      setIngredientRows(next)
                      if (errors.ingredientsText) setErrors(prev => ({ ...prev, ingredientsText: undefined }))
                      if (errors.ingredientRows?.[i]) setErrors(prev => {
                        const rows = { ...prev.ingredientRows }; delete rows[i]
                        return { ...prev, ingredientRows: Object.keys(rows).length ? rows : undefined }
                      })
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        setIngredientRows(prev => {
                          const next = [...prev]
                          next.splice(i + 1, 0, emptyIngredient())
                          return next
                        })
                      }
                    }}
                  />
                  <input
                    className={`${styles.ingredientAmountInput} ${errors.ingredientRows?.[i] ? styles.ingredientAmountError : ''}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={row.amount}
                    placeholder="100"
                    onChange={e => {
                      const next = [...ingredientRows]
                      next[i] = { ...next[i], amount: e.target.value }
                      setIngredientRows(next)
                      if (errors.ingredientRows?.[i] && e.target.value.trim()) setErrors(prev => {
                        const rows = { ...prev.ingredientRows }; delete rows[i]
                        return { ...prev, ingredientRows: Object.keys(rows).length ? rows : undefined }
                      })
                    }}
                  />
                  <UnitPicker
                    value={row.unit}
                    units={UNITS}
                    onChange={unit => {
                      const next = [...ingredientRows]
                      next[i] = { ...next[i], unit }
                      setIngredientRows(next)
                    }}
                  />
                  {ingredientRows.length > 1 && (
                    <button
                      type="button"
                      className={styles.stepRemoveBtn}
                      onClick={() => setIngredientRows(prev => prev.filter((_, j) => j !== i))}
                      aria-label="Видалити інгредієнт"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className={styles.addStepBtn}
              onClick={() => setIngredientRows(prev => [...prev, emptyIngredient()])}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Додати інгредієнт
            </button>
            {errors.ingredientsText && <span className="errorMsg">{errors.ingredientsText}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Кроки приготування *</label>
            <div className={styles.stepsList}>
              {instructions.map((inst, i) => (
                <div key={i} className={styles.stepRow}>
                  <span className={styles.stepNum}>{i + 1}</span>
                  <textarea
                    className={`${styles.stepInput} ${errors.instructions && !inst.trim() ? 'inputError' : ''}`}
                    value={inst}
                    rows={2}
                    placeholder={`Крок ${i + 1}...`}
                    onChange={e => {
                      const next = [...instructions]
                      next[i] = e.target.value
                      setInstructions(next)
                      if (errors.instructions) setErrors(prev => ({ ...prev, instructions: undefined }))
                    }}
                  />
                  {instructions.length > 1 && (
                    <button
                      type="button"
                      className={styles.stepRemoveBtn}
                      onClick={() => setInstructions(prev => prev.filter((_, j) => j !== i))}
                      aria-label="Видалити крок"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className={styles.addStepBtn}
              onClick={() => setInstructions(prev => [...prev, ''])}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Додати крок
            </button>
            {errors.instructions && <span className="errorMsg">{errors.instructions}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Спосіб готування <span className={styles.hint}>(необов'язково)</span></label>
            <div className={styles.chipScrollRow}>
              {METHOD_OPTIONS.map(opt => {
                const active = cookingMethod.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`${styles.iconChip} ${active ? styles.iconChipActive : ''}`}
                    onClick={() => setCookingMethod(prev =>
                      active ? prev.filter(m => m !== opt.id) : [...prev, opt.id]
                    )}
                  >
                    <span className={styles.iconChipEmoji}>{opt.icon}</span>
                    <span className={styles.iconChipLabel}>{opt.id}</span>
                  </button>
                )
              })}
            </div>
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
