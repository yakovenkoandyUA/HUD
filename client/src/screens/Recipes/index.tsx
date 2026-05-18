import React from 'react'
import TopBar from '../../components/layout/TopBar'
import styles from './Recipes.module.css'

const Recipes: React.FC = () => (
  <div className={styles.screen}>
    <TopBar title="Рецепти" />
    <div className={styles.content}>
      <p className={styles.soon}>Незабаром: особиста кулінарна книга + блюдо неділі</p>
    </div>
  </div>
)

export default Recipes
