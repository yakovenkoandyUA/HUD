import React from 'react'
import type { SpaceInfoCard, InfoCardIconType } from '../../store/spaceInfoCardStore'
import styles from './InfoCardsBlock.module.css'

// ── Icons ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<InfoCardIconType, React.ReactElement> = {
  link: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  phone: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.49 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.4 1.1h3a2 2 0 0 1 2 1.72c.127.96.36 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.16 6.16l1.27-1.27a2 2 0 0 1 2.11-.45c.907.34 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  address: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  email: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  text: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <path d="M9 13h6M9 17h6M9 9h1"/>
    </svg>
  ),
  wifi: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
      <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/>
    </svg>
  ),
  code: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3"/>
      <path d="M9 9l3 3-3 3M12 15h3"/>
    </svg>
  ),
}

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  cards:    SpaceInfoCard[]
  color:    string
  onAdd:    () => void
  onEdit:   (card: SpaceInfoCard) => void
  onDelete: (cardId: string) => void
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * InfoCardsBlock
 * --------------
 * Блок кастомних інфо-карток для blank/shared просторів.
 * Кожна картка — iconType + label + value. Тапнути = редагувати.
 *
 * @prop cards    — список карток для цього простору
 * @prop color    — колір простору для акцентів
 * @prop onAdd    — callback відкриття AddInfoCardSheet (нова картка)
 * @prop onEdit   — callback відкриття AddInfoCardSheet з картою для редагування
 * @prop onDelete — callback видалення картки
 */
const InfoCardsBlock: React.FC<Props> = ({ cards, color, onAdd, onEdit, onDelete }) => {
  const colorVar = { '--space-color': color } as React.CSSProperties

  return (
    <section className={styles.root} style={colorVar}>
      <div className={styles.header}>
        <h2 className={styles.title}>ІНФО</h2>
        <button type="button" className={styles.addBtn} style={colorVar} onClick={onAdd} aria-label="Додати картку">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 2v10M2 7h10"/>
          </svg>
        </button>
      </div>

      {cards.length === 0 ? (
        <div className={styles.empty}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M9 13h6M9 17h6"/>
          </svg>
          <p className={styles.emptyText}>Додай корисну інформацію — посилання, контакти, адресу або пароль Wi-Fi</p>
          <button type="button" className={styles.emptyAction} style={colorVar} onClick={onAdd}>Додати інфо</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {cards.map(card => (
            <div key={card._id} className={styles.card} onClick={() => onEdit(card)}>
              <div className={styles.cardIcon} style={colorVar}>
                {ICON_MAP[card.iconType] ?? ICON_MAP.text}
              </div>
              <div className={styles.cardBody}>
                <span className={styles.cardLabel}>{card.label}</span>
                <span className={styles.cardValue}>{card.value}</span>
              </div>
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={e => { e.stopPropagation(); onDelete(card._id) }}
                aria-label="Видалити"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default InfoCardsBlock
