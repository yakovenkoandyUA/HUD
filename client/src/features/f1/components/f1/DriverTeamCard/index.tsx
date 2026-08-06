import React from 'react'
import type { F1TeamInfo } from '../../../data/f1Teams'
import styles from './DriverTeamCard.module.css'

/**
 * DriverTeamCard
 * ---------------
 * "Про команду" — статична довідкова картка на сторінці пілота
 * (лого/картинка боліда, штаб-квартира, керівник, двигун). Дані з data/f1Teams.ts.
 *
 * Props:
 * @prop {F1TeamInfo} team — довідкові дані команди
 */

interface Props {
  team: F1TeamInfo
}

const DriverTeamCard: React.FC<Props> = ({ team }) => {
  return (
    <div className={styles.card} style={{ '--team-color': team.primary } as React.CSSProperties}>
      <span className={styles.title}>ПРО КОМАНДУ</span>

      <div className={styles.body}>
        <div className={styles.logoWrap}>
          {team.carImage && (
            <img src={team.carImage} alt={team.name} className={styles.carImage} onError={e => { e.currentTarget.style.display = 'none' }} />
          )}
        </div>

        <div className={styles.info}>
          <span className={styles.teamName}>{team.name}</span>

          <div className={styles.row}>
            <span className={styles.rowLabel}>ШТАБ-КВАРТИРА</span>
            <span className={styles.rowValue}>{team.hqFlag}&nbsp;{team.hq}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>КЕРІВНИК КОМАНДИ</span>
            <span className={styles.rowValue}>{team.principal}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>ДВИГУН</span>
            <span className={styles.rowValue}>{team.engine}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DriverTeamCard
