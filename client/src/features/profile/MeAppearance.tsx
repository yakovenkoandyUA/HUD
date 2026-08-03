import React from 'react'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { ALL_NAV_SECTIONS, PROFILE_TABS } from '@/shared/components/layout/BottomNav'
import type { Theme, NavStyle, NavLabelMode } from '@/shared/store/uiStore'
import { NAV_STYLE_MAX_PINNED } from '@/shared/store/uiStore'
import { useAchievementsStore } from '@/shared/store/achievementsStore'
import { getUnlockedThemes, THEME_UNLOCK_CONDITIONS } from '@/features/achievements/levels'
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
  { id: 'aurum', name: 'AURUM', bg: '#090d18', surface: '#141a2b', border: '#2b3550', accent: '#e09a30', second: '#b94b6a', gold: '#d9b45d', text: '#f0eadc' },
  { id: 'vellum', name: 'VELLUM', bg: '#f3f0eb', surface: '#faf8f4', border: '#d8d3cb', accent: '#d97824', second: '#3a5a8c', gold: '#9b7740',  text: '#181a22' },
  { id: 'cyber',  name: 'CYBER',  bg: '#06080e', surface: '#131a2c', border: '#202c48', accent: '#ff2060', second: '#00d4ff', gold: '#f0a020',  text: '#d8eaf8' },
  { id: 'noir',   name: 'NOIR',   bg: '#080808', surface: '#1a1a1a', border: '#2a2a2a', accent: '#d0d0d0', second: '#606060', gold: '#c8c8c8',  text: '#ebebeb' },
  { id: 'pixel',  name: 'PIXEL',  bg: '#f4efe0', surface: '#faf6ea', border: '#c8bc94', accent: '#d42020', second: '#1848c8', gold: '#e8a020',  text: '#181028' },
  { id: 'arctic', name: 'ARCTIC', bg: '#101722', surface: '#1e2b3f', border: '#2a4053', accent: '#79d4e6', second: '#b48ead', gold: '#d8c58f',  text: '#eef5f8' },
]

/** Ansuz rune for hub preview */
function PreviewAnsuz() {
  return (
    <svg width="14" height="14" viewBox="0 0 22 22" fill="none">
      <line x1="8" y1="2.5" x2="8" y2="19.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
      <line x1="8" y1="6" x2="16" y2="10.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
      <line x1="8" y1="12" x2="16" y2="16.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
    </svg>
  )
}

interface NavLivePreviewProps {
  navStyle: import('@/shared/store/uiStore').NavStyle
  navLabelMode: import('@/shared/store/uiStore').NavLabelMode
  pinnedSections: string[]
  sportEnabled: boolean
}

/**
 * NavLivePreview
 * --------------
 * Статичний превʼю реального нав-бара відповідно до поточних налаштувань.
 * Перший розділ (/) завжди "активний" для демонстрації.
 */
function NavLivePreview({ navStyle, navLabelMode, pinnedSections, sportEnabled }: NavLivePreviewProps) {
  const sections = ALL_NAV_SECTIONS.filter(s => !s.requiresSport || sportEnabled)
  const demoActive = '/'

  const showLabel = (to: string) =>
    navLabelMode === 'always' || (navLabelMode === 'active' && to === demoActive)

  const pinned = sections.filter(s => pinnedSections.includes(s.to)).slice(0, 4)
  const leftItems  = pinned.length >= 2 ? pinned.slice(0, 2) : sections.slice(0, 2)
  const rightItems = pinned.length >= 4 ? pinned.slice(2, 4) : sections.slice(2, 4)

  return (
    <div className={styles.navLiveWrap}>
      <span className={styles.navLiveTitle}>ПРЕВ'ЮЮ</span>
      <div className={styles.navLiveStage}>

        {navStyle === 'classic' && (
          <div className={styles.navLiveClassic}>
            {sections.map(s => {
              const active = s.to === demoActive
              const label = showLabel(s.to)
              return (
                <div key={s.to} className={`${styles.navLiveClassicItem} ${active ? styles.navLiveActive : ''}`}>
                  <s.Icon className={styles.navLiveIcon} />
                  {label && <span className={styles.navLiveLabel}>{s.label}</span>}
                </div>
              )
            })}
          </div>
        )}

        {navStyle === 'pill' && (
          <div className={`${styles.navLivePill} ${navLabelMode === 'always' ? styles.navLivePillWide : ''}`}>
            {sections.map(s => {
              const active = s.to === demoActive
              const label = showLabel(s.to)
              return (
                <div key={s.to} className={`${styles.navLiveItem} ${active ? styles.navLiveActive : ''} ${label ? styles.navLiveItemExpanded : ''}`}>
                  <s.Icon className={styles.navLiveIcon} />
                  {label && <span className={styles.navLiveLabel}>{s.label}</span>}
                </div>
              )
            })}
          </div>
        )}

        {navStyle === 'hub' && (
          <div className={styles.navLivePill}>
            {leftItems.map(s => {
              const active = s.to === demoActive
              const label = navLabelMode !== 'never' && active
              return (
                <div key={s.to} className={`${styles.navLiveItem} ${active ? styles.navLiveActive : ''} ${label ? styles.navLiveItemExpanded : ''}`}>
                  <s.Icon className={styles.navLiveIcon} />
                  {label && <span className={styles.navLiveLabel}>{s.label}</span>}
                </div>
              )
            })}
            <div className={styles.navLiveHub}><PreviewAnsuz /></div>
            {rightItems.map(s => {
              const active = s.to === demoActive
              const label = navLabelMode !== 'never' && active
              return (
                <div key={s.to} className={`${styles.navLiveItem} ${active ? styles.navLiveActive : ''} ${label ? styles.navLiveItemExpanded : ''}`}>
                  <s.Icon className={styles.navLiveIcon} />
                  {label && <span className={styles.navLiveLabel}>{s.label}</span>}
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}

const LockIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <rect x="2" y="5.5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M4 5.5V3.5a2 2 0 0 1 4 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
)

/**
 * MeAppearance
 * ------------
 * Підекран "Вигляд" вкладки "Я": теми + стиль навігації + закріплені розділи.
 * Теми відкриваються за рівнями досягнень: aurum і vellum доступні одразу,
 * решта — за рівнями 3, 5, 7, 9.
 */
const MeAppearance: React.FC = () => {
  const { activeProfile } = useProfileStore()
  const { theme, setTheme, navStyle, setNavStyle, navLabelMode, setNavLabelMode, pinnedSections, setPinnedSections, pinnedProfileTabs, setPinnedProfileTabs } = useUiStore()
  const unlockedAchievementIds = new Set((activeProfile?.unlockedAchievements ?? []).map(u => u.id))
  const onboardingCompleted = activeProfile?.onboardingCompleted ?? false
  const unlockedThemes = getUnlockedThemes(unlockedAchievementIds, onboardingCompleted)
  const [lockedInfo, setLockedInfo] = React.useState<{ name: string; hint: string } | null>(null)

  return (
    <>
      <div className={styles.cardPadded}>
        <div className={styles.themeGrid}>
          {PALETTES.map(p => {
            const isActive = theme === p.id
            const isUnlocked = unlockedThemes.includes(p.id)
            const unlockHint = THEME_UNLOCK_CONDITIONS[p.id]?.hint ?? ''
            return (
              <button
                key={p.id}
                type="button"
                className={`${styles.themeCard} ${!isUnlocked ? styles.themeCardLocked : ''}`}
                style={{
                  background: p.bg,
                  border: `2px solid ${isActive ? p.accent : p.border}`,
                  boxShadow: isActive ? `0 0 16px ${p.accent}44` : 'none',
                  opacity: isUnlocked ? 1 : 0.45,
                }}
                onClick={() => {
                  if (!isUnlocked) {
                    setLockedInfo({ name: p.name, hint: unlockHint })
                    return
                  }
                  setLockedInfo(null)
                  setTheme(p.id)
                  useAchievementsStore.getState().unlock('theme-changed')
                }}
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
                {!isUnlocked && (
                  <span className={styles.themeLockBadge} style={{ color: p.text, background: `${p.bg}cc` }}>
                    <LockIcon />
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {lockedInfo && (
          <div className={styles.themeLockInfo}>
            <LockIcon />
            <span className={styles.themeLockInfoText}>
              <b>{lockedInfo.name}</b> — {lockedInfo.hint}
            </span>
            <button type="button" className={styles.themeLockInfoClose} onClick={() => setLockedInfo(null)}>
              Зрозуміло
            </button>
          </div>
        )}
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
              onClick={() => {
                setNavStyle(opt.id)
                // Перемикання стилю не мало очевидно зрозумілого ефекту — якщо закріплених
                // розділів більше за ліміт нового стилю (напр. перейшли з "Пілюля", де
                // закріплено все, на "Хаб" з лімітом 4), зайві самі зникають з головного
                // меню й одразу потрапляють у розкладне коло, без ручного вимикання чекбоксів.
                const max = NAV_STYLE_MAX_PINNED[opt.id]
                if (pinnedSections.length > max) {
                  setPinnedSections(pinnedSections.slice(0, max))
                }
              }}
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

        <div className={styles.cardDivider} style={{ margin: '16px 0 12px' }} />
        <div className={styles.cardSubTitle}>ПІДПИСИ</div>
        <div className={styles.navStyleGrid}>
          {([
            { id: 'always', label: 'Завжди',   hint: 'Підпис під кожною іконкою' },
            { id: 'active', label: 'Активна',  hint: 'Тільки поточна сторінка'   },
            { id: 'never',  label: 'Вимкнути', hint: 'Тільки іконки'             },
          ] as { id: NavLabelMode; label: string; hint: string }[]).map(opt => (
            <button
              key={opt.id}
              type="button"
              className={`${styles.navStyleCard} ${navLabelMode === opt.id ? styles.navStyleCardActive : ''}`}
              onClick={() => setNavLabelMode(opt.id)}
              aria-pressed={navLabelMode === opt.id}
            >
              <div className={styles.navPreview}>
                <div className={styles.navPreviewClassic}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span className={`${styles.navPreviewDot} ${opt.id === 'active' && i === 1 ? styles.navPreviewHub : ''}`} />
                      {(opt.id === 'always' || (opt.id === 'active' && i === 1)) && (
                        <span style={{ width: 12, height: 2, borderRadius: 1, background: 'currentColor', opacity: opt.id === 'active' && i === 1 ? 0.9 : 0.4 }} />
                      )}
                    </span>
                  ))}
                </div>
              </div>
              <span className={styles.navStyleLabel}>{opt.label}</span>
              <span className={styles.navStyleHint}>{opt.hint}</span>
            </button>
          ))}
        </div>

        <NavLivePreview
          navStyle={navStyle}
          navLabelMode={navLabelMode}
          pinnedSections={pinnedSections}
          sportEnabled={(activeProfile?.f1Enabled ?? false) || (activeProfile?.footballEnabled ?? false)}
        />

        {navStyle === 'hub' && (() => {
          const isAdmin = activeProfile?.role === 'admin'
          const visibleProfileTabs = PROFILE_TABS.filter(t => !t.adminOnly || isAdmin)
          const MAX_PINNED = 4

          return (
            <>
              <div className={styles.navPinSection}>
                <p className={styles.navPinTitle}>
                  ГОЛОВНА — МЕНЮ
                  <span className={styles.navPinCount}>
                    {pinnedSections.length}/{NAV_STYLE_MAX_PINNED[navStyle]}
                  </span>
                </p>
                {ALL_NAV_SECTIONS.filter(s => !s.requiresSport || (activeProfile?.f1Enabled ?? false) || (activeProfile?.footballEnabled ?? false)).map(s => {
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

              <div className={styles.navPinSection} style={{ marginTop: 4 }}>
                <p className={styles.navPinTitle}>
                  ПРОФІЛЬ — МЕНЮ
                  <span className={styles.navPinCount}>
                    {Math.min(pinnedProfileTabs.filter(id => visibleProfileTabs.some(t => t.id === id)).length, MAX_PINNED)}/{MAX_PINNED}
                  </span>
                </p>
                {visibleProfileTabs.map(tab => {
                  const isPinned = pinnedProfileTabs.includes(tab.id)
                  const currentCount = pinnedProfileTabs.filter(id => visibleProfileTabs.some(t => t.id === id)).length
                  const canAdd = currentCount < MAX_PINNED
                  return (
                    <div key={tab.id} className={styles.navPinRow}>
                      <span className={styles.navPinIcon}>{tab.icon}</span>
                      <span className={styles.navPinLabel}>{tab.label}</span>
                      <button
                        type="button"
                        className={`${styles.toggle} ${isPinned ? styles.toggleOn : ''}`}
                        disabled={!isPinned && !canAdd}
                        onClick={() => {
                          if (isPinned) {
                            setPinnedProfileTabs(pinnedProfileTabs.filter(id => id !== tab.id))
                          } else if (canAdd) {
                            setPinnedProfileTabs([...pinnedProfileTabs, tab.id])
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
                  Незакріплені таби відкриваються через кнопку ᚨ
                </p>
              </div>
            </>
          )
        })()}
      </div>
    </>
  )
}

export default MeAppearance
