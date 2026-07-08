import React from 'react'
import AppHeader from '@/shared/components/layout/AppHeader'
import TimelineBody from './components/timeline/TimelineBody'
import styles from './Timeline.module.css'

/**
 * TimelineScreen
 * --------------
 * Повноекранна версія Timeline за прямим URL `/timeline`
 * (наприклад, deep-link). Основний вхід — таб "Хроніка" в Профілі.
 */
const TimelineScreen: React.FC = () => {
  return (
    <div className={styles.screen}>
      <AppHeader />
      <span className={styles.pageTitle}>ХРОНІКА</span>
      <TimelineBody />
    </div>
  )
}

export default TimelineScreen
