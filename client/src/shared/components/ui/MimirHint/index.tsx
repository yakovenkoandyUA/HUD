import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUiStore, type MimirMode } from '@/shared/store/uiStore'
import styles from './MimirHint.module.css'

const DISMISS_KEY = 'mimir-dismissed-day'

function isDismissedToday(): boolean {
  return sessionStorage.getItem(DISMISS_KEY) === new Date().toDateString()
}
function setDismissedToday() {
  sessionStorage.setItem(DISMISS_KEY, new Date().toDateString())
}

// ── Hints per mode ─────────────────────────────────────────────────────────

const HINTS: Record<MimirMode, string[]> = {
  wise: [
    'Криниця пам\'яті не переповнюється. Лише збагачується.',
    'Що не записане — те не сталось. Що записане — живе вічно.',
    'Дисципліна — це не обмеження. Це форма поваги до себе.',
    'Навіть найменший план краще за найбільший намір.',
    'Пам\'ять — єдине майно, яке не можна вкрасти.',
    'Найкращий момент почати — зараз. Другий найкращий — теж зараз.',
    'Кожен запис — нитка у тканині твоєї хроніки.',
  ],
  witty: [
    'Ти знову відклав це. Як передбачувано.',
    'Мімір пам\'ятає все. Навіть те, що ти забув записати.',
    'Незакриті задачі не зникають. Вони просто чекають.',
    'Вода не стає мудрішою від спостереження. Ти — теж.',
    'Один пожертвував оком заради мудрості. Ти — прокрастинацією?',
    'Локі теж думав, що встигне. Рагнарок не чекав.',
    'Три незакриті задачі. Мімір не здивований. Зовсім.',
  ],
  dark: [
    'Юггдрасіль росте незалежно від твоїх планів.',
    'Рагнарок неминучий. Записи залишаться.',
    'Один пожертвував оком. Знання завжди коштує.',
    'Норни плетуть долю. Ти — лише нитка.',
    'Час — єдиний ресурс, що не поновлюється.',
    'Вічність починається з цього моменту.',
    'Тіні Хель нагадують: кожен день — це шанс.',
  ],
}

function getDailyHint(hints: string[]): string {
  const day = new Date().toDateString()
  let hash = 0
  for (let i = 0; i < day.length; i++) hash = (hash * 31 + day.charCodeAt(i)) & 0xffffffff
  return hints[Math.abs(hash) % hints.length]
}

// ── Pose ───────────────────────────────────────────────────────────────────

export type MimirPose = 'idle' | 'writing' | 'thinking' | 'success' | 'skeptical' | 'pointing' | 'shrug' | 'excited' | 'alarmed' | 'sleeping' | 'celebrating'

const POSE_SRC: Record<MimirPose, string> = {
  idle:        '/mimir/mimir-idle.png',
  writing:     '/mimir/mimir-writing.png',
  thinking:    '/mimir/mimir-thinking.png',
  success:     '/mimir/mimir-success.png',
  skeptical:   '/mimir/mimir-skeptical.png',
  pointing:    '/mimir/mimir-pointing.png',
  shrug:       '/mimir/mimir-shrug.png',
  excited:     '/mimir/mimir-excited.png',
  alarmed:     '/mimir/mimir-alarmed.png',
  sleeping:    '/mimir/mimir-sleeping.png',
  celebrating: '/mimir/mimir-celebrating.png',
}

const POSE_CLASS: Record<MimirPose, string> = {
  idle:        styles.poseIdle,
  writing:     styles.poseWriting,
  thinking:    styles.poseThinking,
  success:     styles.poseSuccess,
  skeptical:   styles.poseSkeptical,
  pointing:    styles.posePointing,
  shrug:       styles.poseShrug,
  excited:     styles.poseExcited,
  alarmed:     styles.poseAlarmed,
  sleeping:    styles.poseSleeping,
  celebrating: styles.poseCelebrating,
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * MimirHint
 * ---------
 * Маскот Мімір з підказкою дня. Три режими задаються в Профіль → Вигляд.
 * Підказка ротується щодня. Завжди рендериться абсолютно (не займає layout).
 *
 * @param pose        - яку позу показати (default: 'idle')
 * @param textKey     - override тексту замість щоденної підказки
 * @param onDismiss   - викликається після анімації закриття (напр. для markSeen)
 * @param oneTime     - режим одноразового хінту: без sessionStorage, тільки локальний стан
 * @param showUpgrade - показати промпт "Оживити Міміра" (коли hint є статичним fallback)
 */
interface MimirHintProps {
  pose?: MimirPose
  textKey?: string
  onDismiss?: () => void
  oneTime?: boolean
  showUpgrade?: boolean
}

const MimirHint: React.FC<MimirHintProps> = ({ pose = 'idle', textKey, onDismiss, oneTime = false, showUpgrade = false }) => {
  const navigate = useNavigate()
  const { mimirMode } = useUiStore()
  // oneTime хінти не залежать від sessionStorage — показуються завжди до dismiss
  const [dismissed, setDismissed] = useState(() => oneTime ? false : isDismissedToday())
  const [hiding, setHiding] = useState(false)

  const dismissedRef = useRef(dismissed)
  dismissedRef.current = dismissed
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss
  const mountTimeRef = useRef(Date.now())

  // For oneTime hints: mark as seen on unmount only if visible for ≥ 3s (user had time to read it)
  useEffect(() => {
    if (!oneTime) return
    return () => {
      if (!dismissedRef.current && Date.now() - mountTimeRef.current > 3000)
        onDismissRef.current?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hint = useMemo(() => {
    if (textKey) return textKey
    return getDailyHint(HINTS[mimirMode])
  }, [mimirMode, textKey])

  const handleDismiss = useCallback(() => {
    if (hiding) return
    setHiding(true)
    setTimeout(() => {
      if (!oneTime) setDismissedToday()
      setDismissed(true)
      onDismiss?.()
    }, 320)
  }, [hiding, oneTime, onDismiss])

  // Tap anywhere on the page dismisses Mimir
  useEffect(() => {
    if (dismissed) return
    const t = setTimeout(() => {
      document.addEventListener('click', handleDismiss, { once: true })
    }, 600)
    return () => {
      clearTimeout(t)
      document.removeEventListener('click', handleDismiss)
    }
  }, [dismissed, handleDismiss])

  if (dismissed) return null

  return (
    <div className={`${styles.root} ${hiding ? styles.rootHiding : ''}`}>
      <div className={styles.row}>
        <img
          src={POSE_SRC[pose]}
          alt="Mimir"
          className={`${styles.avatar} ${POSE_CLASS[pose]}`}
          draggable={false}
        />
        {/* key forces re-mount → bubble entrance animation fires on mode change */}
        <div key={mimirMode} className={styles.bubble}>
          <p className={styles.text}>{hint}</p>
          <span className={styles.signature}>— Мімір</span>
          {showUpgrade ? (
            <button
              type="button"
              className={styles.upgradeLink}
              onClick={(e) => { e.stopPropagation(); navigate('/profile?tab=plan') }}
            >
              Мімір говорить з пам'яті — оживи його
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 5h6M5.5 2.5L8 5l-2.5 2.5"/></svg>
            </button>
          ) : (
            <span className={styles.dismissHint}>торкніться, щоб сховати</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default MimirHint
