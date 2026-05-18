import React from 'react'
import TopBar from '../../components/layout/TopBar'
import styles from './Watchlist.module.css'

const Watchlist: React.FC = () => (
  <div className={styles.screen}>
    <TopBar title="Незабутько" />
    <div className={styles.content}>
      <p className={styles.soon}>Незабаром: фільми, серіали, аніме, книги</p>
    </div>
  </div>
)

export default Watchlist
