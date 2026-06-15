import React from 'react'
import type { Recipe } from '../../../types'
import styles from './CategoryCard.module.css'

/**
 * CategoryCard
 * ------------
 * Картка категорії рецептів для горизонтального слайдера.
 * 1 рецепт → одне фото; 2+ → колаж 2×2; без фото → градієнтний placeholder.
 *
 * Props:
 * @prop {string}     name      — назва категорії
 * @prop {Recipe[]}   recipes   — рецепти цієї категорії
 * @prop {boolean}    isActive  — вибрана категорія
 * @prop {() => void} onClick   — тап по картці
 */
interface CategoryCardProps {
  name: string
  recipes: Recipe[]
  isActive: boolean
  onClick: () => void
}

const CategoryCard: React.FC<CategoryCardProps> = ({ name, recipes, isActive, onClick }) => {
  const withPhoto = recipes.filter(r => r.imageUrl)
  const photos = withPhoto.slice(0, 4)
  const slots = Array.from({ length: 4 }, (_, i) => photos[i] ?? null)

  return (
    <div
      className={`${styles.card} ${isActive ? styles.active : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className={styles.photoWrap}>
        {photos.length === 0 && (
          <div className={styles.placeholder}>
            <span className={styles.initial}>{name[0]?.toUpperCase()}</span>
          </div>
        )}

        {photos.length === 1 && (
          <img src={photos[0].imageUrl} alt={name} className={styles.singlePhoto} loading="lazy" />
        )}

        {photos.length >= 2 && (
          <div className={styles.collage}>
            {slots.map((r, i) =>
              r ? (
                <img key={i} src={r.imageUrl} alt="" className={styles.collagePhoto} loading="lazy" />
              ) : (
                <div key={i} className={styles.collageEmpty} />
              )
            )}
          </div>
        )}

        {isActive && <div className={styles.activeMask} />}
      </div>

      <p className={styles.name}>{name}</p>
    </div>
  )
}

export default CategoryCard
