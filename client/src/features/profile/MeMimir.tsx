import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useUiStore, type MimirMode, type MimirFrequency } from '@/shared/store/uiStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { useCanUseFeature } from '@/shared/hooks/usePlan'
import PillSelector from '@/shared/components/ui/PillSelector'
import styles from './MeMimir.module.css'

// ── Mode config ───────────────────────────────────────────────────────────────

interface ModeOption {
  id: MimirMode
  label: string
  hint: string
  img: string
  sample: string
}

const MODES: ModeOption[] = [
  {
    id: 'wise',
    label: 'МУДРИЙ',
    hint: 'Поради та цитати',
    img: '/mimir/mimir-wise.png',
    sample: 'Криниця пам\'яті не переповнюється. Лише збагачується.',
  },
  {
    id: 'witty',
    label: 'БАЛАГУР',
    hint: 'Жарти і сарказм',
    img: '/mimir/mimir-balaghur.png',
    sample: 'Ти знову відклав це. Аплодисменти, будь ласка.',
  },
  {
    id: 'dark',
    label: 'ЦИНИК',
    hint: 'Похмура мудрість',
    img: '/mimir/mimir-cynical.png',
    sample: 'Час — єдиний ресурс, що не поновлюється. Ну і що ти з ним зробив?',
  },
]

// ── Frequency config ──────────────────────────────────────────────────────────

interface FreqOption {
  value: MimirFrequency
  label: string
  desc: string
}

const FREQ_OPTIONS: FreqOption[] = [
  { value: 'active',   label: 'Активний',    desc: 'Вранці, вдень і ввечері' },
  { value: 'balanced', label: 'Збалансований', desc: 'Раз на день' },
  { value: 'silent',   label: 'Тихий',       desc: 'Тільки коли кликаєш' },
]

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * MeMimir
 * -------
 * Сторінка налаштувань AI-маскота Міміра.
 * Режим (Wise/Witty/Dark) + частота появи + скидання підказок.
 *
 * Props: none
 */
const MeMimir: React.FC = () => {
  const navigate = useNavigate()
  const { mimirMode, setMimirMode, mimirFrequency, setMimirFrequency } = useUiStore()
  const { activeProfile, updateProfile } = useProfileStore()
  const { showToast } = useUiStore()
  const hasAi = useCanUseFeature('mimirAi')

  const [resetting, setResetting] = useState(false)

  const heroRef = useRef<HTMLDivElement>(null)
  const bgRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bg   = bgRef.current
    const hero = heroRef.current
    if (!bg || !hero) return

    // walk up from hero to find the scroll container
    let scrollEl: HTMLElement = document.documentElement
    let el: HTMLElement | null = hero.parentElement
    while (el) {
      const { overflowY } = window.getComputedStyle(el)
      if (overflowY === 'auto' || overflowY === 'scroll') { scrollEl = el; break }
      el = el.parentElement
    }

    const onScroll = () => {
      const top = scrollEl === document.documentElement ? window.scrollY : scrollEl.scrollTop
      // shift backgroundPositionY for subtle parallax on fixed element
      bg.style.backgroundPositionY = `calc(72% + ${top * 0.12}px)`
    }

    const target: EventTarget = scrollEl === document.documentElement ? window : scrollEl
    target.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => target.removeEventListener('scroll', onScroll)
  }, [])

  const current = MODES.find(m => m.id === mimirMode) ?? MODES[0]
  const currentIdx = MODES.findIndex(m => m.id === mimirMode)

  const [animClass, setAnimClass] = useState('')

  const switchMode = (newMode: MimirMode) => {
    if (newMode === mimirMode || animClass) return
    setAnimClass(styles.heroExiting)
    setTimeout(() => {
      setMimirMode(newMode)
      setAnimClass(styles[`heroEnter_${newMode}` as keyof typeof styles])
      setTimeout(() => setAnimClass(''), 450)
    }, 160)
  }

  const prevMode = () => switchMode(MODES[(currentIdx - 1 + MODES.length) % MODES.length].id)
  const nextMode = () => switchMode(MODES[(currentIdx + 1) % MODES.length].id)

  const handleResetHints = async () => {
    if (resetting) return
    setResetting(true)
    try {
      await updateProfile({ mimirSeenHints: [] })
      showToast('Підказки скинуто — Мімір знову привітає тебе', 'success')
    } catch {
      showToast('Помилка скидання підказок', 'error')
    } finally {
      setResetting(false)
    }
  }

  const seenCount = activeProfile?.mimirSeenHints?.length ?? 0

  return (
    <>
    {createPortal(
      <div
        ref={bgRef}
        className={styles.fixedBg}
        style={{ backgroundImage: "url('/mimir/mimir-paralax.png')" }}
      />,
      document.body
    )}
    <div className={styles.root}>

      {/* ── Hero (portrait only, bg is fixed portal) ── */}
      <div ref={heroRef} className={styles.hero}>
        
        <div className={`${styles.heroContent} ${animClass}`}>
          <img src={current.img} alt="Мімір" className={styles.portraitImg} />
          <div className={styles.portraitMeta}>
            <span className={styles.portraitName}>МІМІР</span>
            <div className={styles.modeSwitcher}>
              <button type="button" className={styles.modeArrow} onClick={prevMode} aria-label="Попередній режим">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8 2L4 6l4 4"/>
                </svg>
              </button>
              <div className={styles.modeSwitcherLabel}>
                <span className={styles.portraitMode}>{current.label}</span>
                <span className={styles.portraitModeHint}>{current.hint}</span>
              </div>
              <button type="button" className={styles.modeArrow} onClick={nextMode} aria-label="Наступний режим">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 2l4 4-4 4"/>
                </svg>
              </button>
            </div>
          </div>
          <div className={styles.sampleBubble}>
            <p className={styles.sampleText}>«{current.sample}»</p>
            <span className={styles.sampleSig}>— Мімір</span>
          </div>
        </div>
      </div>

      {/* ── Frequency + AI — one block ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>ЧАСТОТА</h2>
        <PillSelector
          options={FREQ_OPTIONS.map(f => ({ value: f.value, label: f.label }))}
          value={mimirFrequency}
          onChange={v => setMimirFrequency(v as MimirFrequency)}
        />
        <p className={styles.freqDesc}>
          {FREQ_OPTIONS.find(f => f.value === mimirFrequency)?.desc}
        </p>

        <div className={styles.sectionDivider} />

        <div className={`${styles.aiInner} ${hasAi ? styles.aiInnerActive : ''}`}>
          <div className={styles.aiCardIcon}>
            {hasAi ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 1L11 6.5H17L12 10.5L14 16L9 12.5L4 16L6 10.5L1 6.5H7L9 1Z"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4" y="8" width="10" height="8" rx="1.5"/>
                <path d="M6.5 8V5.5a2.5 2.5 0 0 1 5 0V8"/>
              </svg>
            )}
          </div>
          <div className={styles.aiCardBody}>
            <span className={styles.aiCardTitle}>
              {hasAi ? 'Криниця відкрита' : 'Живий Мімір'}
            </span>
            <span className={styles.aiCardDesc}>
              {hasAi
                ? 'Мімір читає твій день цілком — задачі, витрати, настрій. Говорить не шаблоном, а тим що дізнався про тебе.'
                : 'З підпискою Мімір знатиме твій день і говоритиме не шаблонами.'}
            </span>
          </div>
          {!hasAi && (
            <button
              type="button"
              className={styles.aiCardCta}
              onClick={() => navigate('/profile?tab=plan')}
            >
              Тарифи
            </button>
          )}
        </div>
      </section>

      {/* ── Reset hints ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>ПІДКАЗКИ</h2>
        <div className={styles.resetRow}>
          <div className={styles.resetInfo}>
            <span className={styles.resetLabel}>Переглянуто підказок</span>
            <span className={styles.resetCount}>{seenCount}</span>
          </div>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={handleResetHints}
            disabled={resetting || seenCount === 0}
          >
            {resetting ? (
              <span className={styles.spinner} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2A5.5 5.5 0 1 1 6.5 1"/>
                <path d="M9 1l-2.5 2.5L9 6"/>
              </svg>
            )}
            Скинути
          </button>
        </div>
        <p className={styles.resetHint}>
          Мімір знову покаже підказки, які ти вже бачив
        </p>
      </section>

    </div>
    </>
  )
}

export default MeMimir
