import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShoppingListStore, type ShoppingItem } from '../../store/shoppingListStore'
import { useRecipesStore } from '../../store/recipesStore'
import Modal from '../../components/ui/Modal'
import styles from './ShoppingList.module.css'

const UNITS = ['г', 'кг', 'мл', 'л', 'шт', 'ч.л.', 'ст.л.']

/* ── Icons ─────────────────────────────────────────────────────── */

const BackIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M11 14L6 9l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const TrashCheckedIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M2.5 4.5h13M6 4.5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5M4 4.5l1 10h8l1-10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 8l1.5 1.5L11 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const TrashAllIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M2.5 4.5h13M6 4.5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5M4 4.5l1 10h8l1-10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CloseIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const CheckIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ChevronIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const BasketIcon: React.FC = () => (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
    <circle cx="36" cy="36" r="35" stroke="currentColor" strokeWidth="1.5" opacity="0.12"/>
    <path d="M20 28h32l-4 18H24L20 28z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M27 28l4-8M45 28l-4-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M30 35v6M36 35v6M42 35v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
  </svg>
)

/* ── Item row ───────────────────────────────────────────────────── */

/**
 * ItemRow
 * -------
 * Single ingredient row with checkbox, name, amount, remove button.
 */
const ItemRow: React.FC<{ item: ShoppingItem; showRecipeName?: boolean }> = ({ item, showRecipeName }) => {
  const { toggleItem, removeItem } = useShoppingListStore()
  return (
    <div className={`${styles.item} ${item.checked ? styles.itemChecked : ''}`}>
      <button
        type="button"
        className={`${styles.checkbox} ${item.checked ? styles.checkboxChecked : ''}`}
        onClick={() => toggleItem(item.id)}
        aria-label={item.checked ? 'Відмітити як не куплений' : 'Відмітити як куплений'}
      >
        {item.checked && <CheckIcon />}
      </button>
      <div className={styles.itemBody}>
        <span className={styles.itemName}>{item.name}</span>
        {showRecipeName && <span className={styles.itemRecipe}>{item.recipeName}</span>}
      </div>
      <span className={styles.itemAmount}>
        {item.amount !== 1 || item.unit !== 'шт' ? `${item.amount} ${item.unit}` : ''}
      </span>
      <button
        type="button"
        className={styles.removeBtn}
        onClick={() => removeItem(item.id)}
        aria-label="Видалити"
      >
        <CloseIcon />
      </button>
    </div>
  )
}

/* ── Recipe group header ────────────────────────────────────────── */

/**
 * RecipeGroupHeader
 * -----------------
 * Banner for a recipe's ingredient group: image, name (→ detail), progress.
 */
interface RecipeGroupHeaderProps {
  recipeId: string
  recipeName: string
  imageUrl?: string
  checkedCount: number
  total: number
}

const RecipeGroupHeader: React.FC<RecipeGroupHeaderProps> = ({
  recipeId, recipeName, imageUrl, checkedCount, total,
}) => {
  const navigate = useNavigate()
  const pct = total > 0 ? (checkedCount / total) * 100 : 0
  const done = checkedCount === total

  return (
    <div className={`${styles.groupHeader} ${done ? styles.groupHeaderDone : ''}`}>
      <button
        type="button"
        className={styles.groupImgBtn}
        onClick={() => navigate(`/recipes/${recipeId}`)}
        aria-label={`Відкрити рецепт ${recipeName}`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={recipeName} className={styles.groupImg} />
        ) : (
          <div className={styles.groupImgPlaceholder}>
            <span className={styles.groupImgInitial}>{recipeName[0]?.toUpperCase()}</span>
          </div>
        )}
      </button>
      <div className={styles.groupInfo}>
        <button
          type="button"
          className={styles.groupNameBtn}
          onClick={() => navigate(`/recipes/${recipeId}`)}
        >
          <span className={styles.groupName}>{recipeName}</span>
          <ChevronIcon />
        </button>
        <div className={styles.groupProgressRow}>
          <div className={styles.groupBar}>
            <div className={styles.groupBarFill} style={{ width: `${pct}%` }} />
          </div>
          <span className={`${styles.groupCount} ${done ? styles.groupCountDone : ''}`}>
            {checkedCount}/{total}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── Screen ─────────────────────────────────────────────────────── */

/**
 * ShoppingListScreen
 * ------------------
 * Список покупок, згрупований по рецептах з фото страви.
 */
const ShoppingListScreen: React.FC = () => {
  const navigate = useNavigate()
  const { items, addManual, clearAll, clearChecked } = useShoppingListStore()
  const { recipes } = useRecipesStore()
  const [confirmClear, setConfirmClear] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addAmount, setAddAmount] = useState('')
  const [addUnit, setAddUnit] = useState('шт')

  const checkedCount = items.filter(it => it.checked).length
  const total = items.length
  const progress = total > 0 ? (checkedCount / total) * 100 : 0

  /* Build recipe groups: Map<recipeId, ShoppingItem[]> */
  const { recipeGroups, manualItems } = useMemo(() => {
    const groupMap = new Map<string, ShoppingItem[]>()
    const manual: ShoppingItem[] = []

    for (const item of items) {
      if (item.recipeId === 'manual') {
        manual.push(item)
      } else {
        const existing = groupMap.get(item.recipeId) ?? []
        groupMap.set(item.recipeId, [...existing, item])
      }
    }

    const groups = Array.from(groupMap.entries()).map(([recipeId, groupItems]) => {
      const recipe = recipes.find(r => r.id === recipeId)
      const sorted = [...groupItems].sort((a, b) => Number(a.checked) - Number(b.checked))
      return { recipeId, recipe, items: sorted }
    })

    const sortedManual = [...manual].sort((a, b) => Number(a.checked) - Number(b.checked))
    return { recipeGroups: groups, manualItems: sortedManual }
  }, [items, recipes])

  const handleAddManual = () => {
    if (!addName.trim()) return
    addManual(addName, addAmount ? parseFloat(addAmount) : 1, addUnit)
    setAddName('')
    setAddAmount('')
    setAddUnit('шт')
    setShowAdd(false)
  }

  return (
    <div className={styles.screen}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Назад">
          <BackIcon />
        </button>
        <div className={styles.headerCenter}>
          <h1 className={styles.headerTitle}>Список покупок</h1>
          {total > 0 && (
            <span className={styles.headerCount}>{checkedCount}/{total} ✓</span>
          )}
        </div>
        <div className={styles.headerRight} />
      </header>

      <div className={styles.content}>

        {/* ── Overall progress bar ── */}
        {total > 0 && (
          <div className={styles.progressWrap}>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <span className={styles.progressLabel}>{Math.round(progress)}%</span>
          </div>
        )}

        {/* ── Toolbar ── */}
        {total > 0 && (
          <div className={styles.toolbar}>
            {confirmClear ? (
              <>
                <span className={styles.toolbarConfirm}>Видалити все?</span>
                <button type="button" className={`${styles.toolBtn} ${styles.toolBtnDanger}`} onClick={() => { clearAll(); setConfirmClear(false) }}>
                  Так
                </button>
                <button type="button" className={styles.toolBtn} onClick={() => setConfirmClear(false)}>
                  Ні
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={clearChecked}
                  disabled={checkedCount === 0}
                  aria-label="Видалити куплені"
                  title="Видалити куплені"
                >
                  <TrashCheckedIcon />
                </button>
                <div className={styles.toolSep} />
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={() => setConfirmClear(true)}
                  aria-label="Очистити все"
                  title="Очистити все"
                >
                  <TrashAllIcon />
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Empty state ── */}
        {total === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}><BasketIcon /></span>
            <p className={styles.emptyTitle}>Список порожній</p>
            <p className={styles.emptyHint}>Додай інгредієнти з рецепту або вручну</p>
          </div>
        )}

        {/* ── Recipe groups ── */}
        {recipeGroups.map(({ recipeId, recipe, items: groupItems }) => {
          const groupChecked = groupItems.filter(it => it.checked).length
          return (
            <div key={recipeId} className={styles.recipeGroup}>
              <RecipeGroupHeader
                recipeId={recipeId}
                recipeName={recipe?.title ?? groupItems[0]?.recipeName ?? 'Рецепт'}
                imageUrl={recipe?.imageUrl}
                checkedCount={groupChecked}
                total={groupItems.length}
              />
              <div className={styles.groupItems}>
                {groupItems.map(item => <ItemRow key={item.id} item={item} />)}
              </div>
            </div>
          )
        })}

        {/* ── Manual items ── */}
        {manualItems.length > 0 && (
          <div className={styles.recipeGroup}>
            <p className={styles.manualLabel}>Вручну</p>
            <div className={styles.groupItems}>
              {manualItems.map(item => <ItemRow key={item.id} item={item} />)}
            </div>
          </div>
        )}

      </div>

      {/* ── FAB ── */}
      <button
        type="button"
        className={styles.fab}
        onClick={() => setShowAdd(true)}
        aria-label="Додати вручну"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M3 11h16M11 3v16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* ── Add item modal ── */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Додати позицію">
        <div className={styles.addForm}>
          <div className={styles.addField}>
            <label className={styles.addLabel}>Назва</label>
            <input
              className={styles.addInput}
              value={addName}
              onChange={e => setAddName(e.target.value)}
              placeholder="Наприклад: борошно"
              autoFocus
            />
          </div>
          <div className={styles.addRow}>
            <div className={styles.addField}>
              <label className={styles.addLabel}>Кількість</label>
              <input
                className={styles.addInput}
                type="number"
                min="0"
                step="0.1"
                value={addAmount}
                onChange={e => setAddAmount(e.target.value)}
                placeholder="1"
              />
            </div>
            <div className={styles.addField}>
              <label className={styles.addLabel}>Одиниця</label>
              <select className={styles.addInput} value={addUnit} onChange={e => setAddUnit(e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <button type="button" className={styles.addBtn} onClick={handleAddManual}>
            Додати
          </button>
        </div>
      </Modal>

    </div>
  )
}

export default ShoppingListScreen
