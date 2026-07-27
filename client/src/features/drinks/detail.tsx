import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppHeader from '@/shared/components/layout/AppHeader'
import { useDrinksStore } from './store/drinksStore'
import { useSpacesStore } from '@/features/memories/store/spacesStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { DRINK_TYPE_LABELS, DRINK_STATUS_LABELS } from './types'
import type { DrinkFormState } from './types'
import FlavorRadar from './components/FlavorRadar'
import AddDrinkSheet from './components/AddDrinkSheet'
import TastingSheet from './components/TastingSheet'
import BuySheet from './components/BuySheet'
import { formatDateUA } from '@/shared/utils/formatDate'
import styles from './DrinkDetail.module.css'

/**
 * DrinkDetail — full detail page for a single drink.
 * Routes: /drinks/:id
 */

function getRatingLabel(rating: number): string {
  if (rating >= 9) return 'Винятково'
  if (rating >= 7) return 'Дуже добре'
  if (rating >= 5) return 'Добре'
  if (rating >= 3) return 'Посередньо'
  return 'Слабко'
}

const DrinkDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const showToast = useUiStore(s => s.showToast)
  const { drinks, deleteDrink, deleteTasting, rateDrink } = useDrinksStore()
  const spaces = useSpacesStore(s => s.spaces)
  const cellarSpace = spaces.find(s => s.type === 'cellar')
  const backPath = cellarSpace ? `/spaces/${cellarSpace.id}` : '/'
  const myUserId = useProfileStore(s => s.activeProfile?.id ?? '')

  const drink = drinks.find(d => d._id === id)

  const [editOpen,    setEditOpen]    = useState(false)
  const [tastingOpen, setTastingOpen] = useState(false)
  const [buyOpen,     setBuyOpen]     = useState(false)

  if (!drink) {
    return (
      <div className={styles.page}>
        <AppHeader />
        <p className={styles.notFound}>Напій не знайдено</p>
      </div>
    )
  }

  async function handleDelete() {
    await deleteDrink(drink!._id)
    showToast('Видалено', 'success')
    navigate('/drinks')
  }

  const initialValues: Partial<DrinkFormState> = {
    name: drink.name, brand: drink.brand, type: drink.type,
    country: drink.country, distillery: drink.distillery,
    abv: drink.abv?.toString() ?? '', photo: drink.photo,
    status: drink.status, price: drink.price?.toString() ?? '',
    notes: drink.notes,
    flavor: { ...drink.flavor },
  }

  const hasFlavorData = Object.values(drink.flavor).some(v => v > 0)

  const avgRating = drink.ratings.length
    ? Math.round(drink.ratings.reduce((s, r) => s + r.score, 0) / drink.ratings.length * 10) / 10
    : null
  const myRating = drink.ratings.find(r => r.userId === myUserId)?.score ?? null

  async function handleRate(score: number) {
    const next = myRating === score ? null : score
    await rateDrink(drink!._id, next)
  }

  const metaParts = [
    DRINK_TYPE_LABELS[drink.type],
    drink.abv !== null ? `${drink.abv}%` : null,
    drink.country || null,
  ].filter(Boolean).join(' · ')

  return (
    <div className={styles.page}>
      <AppHeader />

      {/* Sub-header */}
      <div className={styles.subHeader}>
        <button className={styles.backBtn} onClick={() => navigate(backPath)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          CELLAR
        </button>
        <button className={styles.editBtn} onClick={() => setEditOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>

      <div className={styles.content}>
        {/* Hero */}
        <div className={styles.hero}>
          {drink.photo ? (
            <img src={drink.photo} alt={drink.name} className={styles.heroPhoto} />
          ) : (
            <div className={styles.heroPlaceholder}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2h8l1 6H7L8 2z" />
                <path d="M7 8c0 8 2 12 5 12s5-4 5-12" />
                <path d="M9 8v4" /><path d="M15 8v4" />
              </svg>
            </div>
          )}
          <div className={styles.heroInfo}>
            <div className={`${styles.statusBadge} ${drink.status === 'finished' ? styles.statusFinished : ''}`}>
              {drink.status === 'finished' && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {DRINK_STATUS_LABELS[drink.status]}
            </div>
            <h1 className={styles.heroName}>{drink.name}</h1>
            {drink.brand && <p className={styles.heroBrand}>{drink.brand}</p>}
            {metaParts && <p className={styles.heroMeta}>{metaParts}</p>}
            {drink.distillery && <p className={styles.distillery}>{drink.distillery}</p>}
            {drink.price !== null && (
              <p className={styles.price}>
                <span className={styles.priceVal}>{drink.price.toLocaleString('uk-UA')}</span>
                <span className={styles.priceCur}> ₴</span>
              </p>
            )}
          </div>
        </div>

        {/* Flavor radar */}
        {hasFlavorData && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>ФЛЕЙВОР-ПРОФІЛЬ</h2>
            <div className={styles.radarWrap}>
              <FlavorRadar flavor={drink.flavor} size={240} />
            </div>
          </div>
        )}

        {/* Rating */}
        <div className={styles.ratingSection}>
          <div className={styles.ratingSummary}>
            {avgRating !== null ? (
              <>
                <span className={styles.ratingNum}>{avgRating}</span>
                <span className={styles.ratingMax}>/10</span>
                <span className={styles.ratingWord}>{getRatingLabel(avgRating)}</span>
                {drink.ratings.length > 1 && (
                  <span className={styles.ratingCount}>· {drink.ratings.length} оцінки</span>
                )}
              </>
            ) : (
              <span className={styles.ratingEmpty}>Ще без оцінки</span>
            )}
          </div>
          <div className={styles.ratingPicker}>
            {Array.from({ length: 10 }, (_, i) => (
              <button
                key={i}
                className={`${styles.ratingDot} ${myRating !== null && i < myRating ? styles.ratingDotFilled : ''}`}
                onClick={() => handleRate(i + 1)}
              />
            ))}
          </div>
          {myRating !== null && (
            <p className={styles.ratingMine}>Моя оцінка: {myRating}/10</p>
          )}
        </div>

        {/* Notes */}
        {drink.notes && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>НОТАТКИ</h2>
            <p className={styles.notes}>{drink.notes}</p>
          </div>
        )}

        {/* Tastings */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>ДЕГУСТАЦІЇ · {drink.tastings.length}</h2>
            <button className={styles.addTastingBtn} onClick={() => setTastingOpen(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Додати
            </button>
          </div>
          {drink.tastings.length === 0 ? (
            <div className={styles.emptyTastings}>
              <p className={styles.emptyTitle}>Записів ще немає</p>
              {drink.status === 'finished' ? (
                <p className={styles.emptyHint}>
                  Напій позначено як скуштований, але запис дегустації ще не додано.
                </p>
              ) : (
                <p className={styles.emptyHint}>
                  Додайте аромат, смак і враження після першої дегустації.
                </p>
              )}
            </div>
          ) : (
            <div className={styles.tastings}>
              {[...drink.tastings].reverse().map(t => (
                <div key={t._id} className={styles.tastingCard}>
                  <div className={styles.tastingTop}>
                    <span className={styles.tastingDate}>{formatDateUA(t.date)}</span>
                    <span className={styles.tastingRating}>{t.rating}/10</span>
                    <button
                      className={styles.tastingDelete}
                      onClick={() => deleteTasting(drink!._id, t._id)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6" /><path d="M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </div>
                  {t.occasion && <p className={styles.tastingOccasion}>{t.occasion}</p>}
                  {t.notes && <p className={styles.tastingNotes}>{t.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.buyBtn} onClick={() => setBuyOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.buyIcon}>
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {drink.price !== null
              ? `Списати ${drink.price.toLocaleString('uk-UA')} ₴ у фінанси`
              : 'Списати у фінанси'}
          </button>
        </div>

      </div>

      {editOpen && (
        <AddDrinkSheet
          onClose={() => setEditOpen(false)}
          initialId={drink._id}
          initialValues={initialValues}
          onDelete={handleDelete}
        />
      )}
      {tastingOpen && (
        <TastingSheet
          drinkId={drink._id}
          drinkName={drink.name}
          onClose={() => setTastingOpen(false)}
        />
      )}
      {buyOpen && (
        <BuySheet
          drinkId={drink._id}
          drinkName={drink.name}
          defaultPrice={drink.price}
          onClose={() => setBuyOpen(false)}
        />
      )}
    </div>
  )
}

export default DrinkDetail
