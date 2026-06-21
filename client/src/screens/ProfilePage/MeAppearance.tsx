import React from 'react'
import { useProfileStore } from '../../store/profileStore'
import { useUiStore } from '../../store/uiStore'
import { ALL_NAV_SECTIONS } from '../../components/layout/BottomNav'
import type { Theme, NavStyle } from '../../store/uiStore'
import { NAV_STYLE_MAX_PINNED } from '../../store/uiStore'
import { useAchievementsStore } from '../../store/achievementsStore'
import styles from './ProfilePage.module.css'

interface ThemePalette {
  id: Theme
  name: string
  bg: string
  surface: string
  border: string
  accent: string
  second: string
  gold: string
  text: string
}

const PALETTES: ThemePalette[] = [
  { id: 'velvet', name: 'VELVET', bg: '#0d0f1a', surface: '#1e2235', border: '#2e3450', accent: '#d4a017', second: '#6a4fc8', gold: '#d4a017', text: '#e8d5a0' },
  { id: 'japan',  name: 'JAPAN',  bg: '#F5F0EB', surface: '#EDE8E2', border: '#D5CEC5', accent: '#C8102E', second: '#1a1a1a', gold: '#8B7355',  text: '#1a1a1a' },
  { id: 'cyber',  name: 'CYBER',  bg: '#06080e', surface: '#131a2c', border: '#202c48', accent: '#ff2060', second: '#00d4ff', gold: '#f0a020',  text: '#d8eaf8' },
  { id: 'noir',   name: 'NOIR',   bg: '#080808', surface: '#1a1a1a', border: '#2a2a2a', accent: '#d0d0d0', second: '#606060', gold: '#c8c8c8',  text: '#ebebeb' },
  { id: 'pixel',  name: 'PIXEL',  bg: '#f4efe0', surface: '#faf6ea', border: '#c8bc94', accent: '#d42020', second: '#1848c8', gold: '#e8a020',  text: '#181028' },
  { id: 'arctic', name: 'ARCTIC', bg: '#1e2330', surface: '#313a4e', border: '#4a5570', accent: '#88c0d0', second: '#b48ead', gold: '#ebcb8b',  text: '#eceff4' },
]

/**
 * MeAppearance
 * ------------
 * Підекран "Вигляд" вкладки "Я": теми + стиль навігації + закріплені розділи.
 */
const MeAppearance: React.FC = () => {
  const { activeProfile } = useProfileStore()
  const { theme, setTheme, navStyle, setNavStyle, pinnedSections, setPinnedSections } = useUiStore()

  return (
    <>
      <div className={styles.cardPadded}>
        <div className={styles.themeGrid}>
          {PALETTES.map(p => {
            const isActive = theme === p.id
            return (
              <button
                key={p.id}
                type="button"
                className={styles.themeCard}
                style={{
                  background: p.bg,
                  border: isActive ? `2px solid ${p.accent}` : `1.5px solid ${p.border}`,
                  boxShadow: isActive ? `0 0 16px ${p.accent}44` : 'none',
                }}
                onClick={() => { setTheme(p.id); useAchievementsStore.getState().unlock('theme-changed') }}
                aria-pressed={isActive}
              >
                <span className={styles.themeCardName} style={{ color: p.accent }}>{p.name}</span>
                <div className={styles.themeSwatches}>
                  <span className={styles.themeSwatch} style={{ background: p.accent }} />
                  <span className={styles.themeSwatch} style={{ background: p.second }} />
                  <span className={styles.themeSwatch} style={{ background: p.gold }} />
                  <span className={styles.themeSwatch} style={{ background: p.text, opacity: 0.7 }} />
                </div>
                <div className={styles.themePreview}>
                  <div className={styles.themePreviewBar} style={{ background: p.surface, border: `1px solid ${p.border}` }}>
                    <div className={styles.themePreviewDot} style={{ background: p.accent }} />
                    <div className={styles.themePreviewLine} style={{ background: p.text, opacity: 0.6 }} />
                    <div className={styles.themePreviewLine} style={{ background: p.text, opacity: 0.3, width: '40%' }} />
                  </div>
                  <div className={styles.themePreviewBar} style={{ background: p.surface, border: `1px solid ${p.border}` }}>
                    <div className={styles.themePreviewDot} style={{ background: p.second }} />
                    <div className={styles.themePreviewLine} style={{ background: p.text, opacity: 0.6 }} />
                    <div className={styles.themePreviewLine} style={{ background: p.text, opacity: 0.3, width: '55%' }} />
                  </div>
                </div>
                {isActive && <span className={styles.themeActiveTick} style={{ color: p.accent }}>✓</span>}
              </button>
            )
          })}
        </div>
      </div>
      <div className={styles.cardDivider} />
      <div className={styles.cardPadded}>
        <div className={styles.cardSubTitle}>НАВІГАЦІЯ</div>
        <div className={styles.navStyleGrid}>
          {([
            { id: 'classic', label: 'Класик',  hint: 'Всі розділи в рядку' },
            { id: 'pill',    label: 'Пілюля',  hint: 'Мінімальна плаваюча' },
            { id: 'hub',     label: 'Хаб',     hint: 'Головне + розкладне' },
          ] as { id: NavStyle; label: string; hint: string }[]).map(opt => (
            <button
              key={opt.id}
              type="button"
              className={`${styles.navStyleCard} ${navStyle === opt.id ? styles.navStyleCardActive : ''}`}
              onClick={() => setNavStyle(opt.id)}
              aria-pressed={navStyle === opt.id}
            >
              <div className={styles.navPreview}>
                {opt.id === 'classic' && (
                  <div className={styles.navPreviewClassic}>
                    {[0,1,2,3,4].map(i => <span key={i} className={styles.navPreviewDot} />)}
                  </div>
                )}
                {opt.id === 'pill' && (
                  <div className={styles.navPreviewPill}>
                    {[0,1,2,3].map(i => <span key={i} className={styles.navPreviewDot} />)}
                  </div>
                )}
                {opt.id === 'hub' && (
                  <div className={styles.navPreviewPill}>
                    <span className={styles.navPreviewDot} />
                    <span className={styles.navPreviewDot} />
                    <span className={`${styles.navPreviewDot} ${styles.navPreviewHub}`} />
                    <span className={styles.navPreviewDot} />
                    <span className={styles.navPreviewDot} />
                  </div>
                )}
              </div>
              <span className={styles.navStyleLabel}>{opt.label}</span>
              <span className={styles.navStyleHint}>{opt.hint}</span>
            </button>
          ))}
        </div>

        {navStyle === 'hub' && (
          <div className={styles.navPinSection}>
            <p className={styles.navPinTitle}>
              ГОЛОВНЕ МЕНЮ
              <span className={styles.navPinCount}>
                {pinnedSections.length}/{NAV_STYLE_MAX_PINNED[navStyle]}
              </span>
            </p>
            {ALL_NAV_SECTIONS.filter(s => !s.requiresF1 || (activeProfile?.f1Enabled ?? false)).map(s => {
              const isPinned = pinnedSections.includes(s.to)
              const maxPinned = NAV_STYLE_MAX_PINNED[navStyle]
              const canAdd = pinnedSections.length < maxPinned
              return (
                <div key={s.to} className={styles.navPinRow}>
                  <s.Icon className={styles.navPinIcon} />
                  <span className={styles.navPinLabel}>{s.label}</span>
                  <button
                    type="button"
                    className={`${styles.toggle} ${isPinned ? styles.toggleOn : ''}`}
                    disabled={!isPinned && !canAdd}
                    onClick={() => {
                      if (isPinned) {
                        setPinnedSections(pinnedSections.filter(p => p !== s.to))
                      } else if (canAdd) {
                        setPinnedSections([...pinnedSections, s.to])
                      }
                    }}
                    aria-pressed={isPinned}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>
              )
            })}
            <p className={styles.sectionHint} style={{ marginTop: 8 }}>
              Незакріплені розділи відкриваються через кнопку M
            </p>
          </div>
        )}
      </div>
    </>
  )
}

export default MeAppearance
