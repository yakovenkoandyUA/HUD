import React from 'react'
import type { Recipe } from '../../../types'
import CategoryCard from '../CategoryCard'
import styles from './CategoriesSlider.module.css'

/**
 * CategoriesSlider
 * ----------------
 * Горизонтальний слайдер категорій, побудований з наявних рецептів.
 * "Всі рецепти" — перша картка, решта сортується за кількістю рецептів.
 *
 * Props:
 * @prop {Recipe[]}          recipes           — весь список рецептів
 * @prop {string | null}     selectedCategory  — активна категорія (null = всі)
 * @prop {(c: string | null) => void} onSelect — вибір категорії
 */
interface CategoriesSliderProps {
  recipes: Recipe[]
  selectedCategory: string | null
  onSelect: (category: string | null) => void
}

const CategoriesSlider: React.FC<CategoriesSliderProps> = ({ recipes, selectedCategory, onSelect }) => {
  const categoryMap = new Map<string, Recipe[]>()
  for (const r of recipes) {
    const cat = r.category ?? 'Інше'
    if (!categoryMap.has(cat)) categoryMap.set(cat, [])
    categoryMap.get(cat)!.push(r)
  }

  const categories = [...categoryMap.entries()]
    .sort((a, b) => b[1].length - a[1].length)

  return (
    <div className={styles.scroll}>
      <CategoryCard
        name="Всі рецепти"
        recipes={recipes}
        isActive={selectedCategory === null}
        onClick={() => onSelect(null)}
      />
      {categories.map(([cat, recs]) => (
        <CategoryCard
          key={cat}
          name={cat}
          recipes={recs}
          isActive={selectedCategory === cat}
          onClick={() => onSelect(cat)}
        />
      ))}
    </div>
  )
}

export default CategoriesSlider
