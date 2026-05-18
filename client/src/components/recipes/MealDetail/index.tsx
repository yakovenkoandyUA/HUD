import React from 'react'
import type { Meal } from '../../../types'
import styles from './MealDetail.module.css'

/**
 * MealDetail
 * ----------
 * Повна інформація про блюдо з TheMealDB.
 * Відображається всередині Modal.
 *
 * Props:
 * @prop {Meal} meal — дані блюда
 */
interface MealDetailProps {
  meal: Meal
}

const MealDetail: React.FC<MealDetailProps> = ({ meal }) => {
  const paragraphs = meal.instructions
    .split(/\r\n\r\n|\n\n/)
    .map((p) => p.replace(/\r\n|\n/g, ' ').trim())
    .filter(Boolean)

  return (
    <div className={styles.wrap}>
      <img src={meal.thumb} alt={meal.name} className={styles.image} loading="lazy" />
      <div className={styles.meta}>
        {meal.area && <span className={styles.tag}>{meal.area}</span>}
        {meal.category && <span className={styles.tag}>{meal.category}</span>}
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Інгредієнти</h3>
        <ul className={styles.ingredients}>
          {meal.ingredients.map((ing, i) => (
            <li key={i} className={styles.ingredient}>
              <span className={styles.ingName}>{ing.name}</span>
              {ing.measure && <span className={styles.ingMeasure}>{ing.measure}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Приготування</h3>
        <div className={styles.instructions}>
          {paragraphs.map((p, i) => (
            <p key={i} className={styles.step}>{p}</p>
          ))}
        </div>
      </section>
    </div>
  )
}

export default MealDetail
