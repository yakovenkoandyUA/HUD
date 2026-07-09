import React, { useMemo } from 'react'
import { useUiStore, type MimirMode } from '@/shared/store/uiStore'
import styles from './MimirHint.module.css'

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

const MODE_LABELS: Record<MimirMode, string> = {
  wise:  'Мудрий',
  witty: 'Дотепний',
  dark:  'Темний',
}

const MODES: MimirMode[] = ['wise', 'witty', 'dark']

function getDailyHint(hints: string[]): string {
  const day = new Date().toDateString()
  let hash = 0
  for (let i = 0; i < day.length; i++) hash = (hash * 31 + day.charCodeAt(i)) & 0xffffffff
  return hints[Math.abs(hash) % hints.length]
}

// ── Pose ───────────────────────────────────────────────────────────────────

export type MimirPose = 'idle' | 'writing' | 'thinking' | 'success'

const POSE_SRC: Record<MimirPose, string> = {
  idle:     '/mimir-idle.png',
  writing:  '/mimir-writing.png',
  thinking: '/mimir-thinking.png',
  success:  '/mimir-success.png',
}

const POSE_CLASS: Record<MimirPose, string> = {
  idle:     styles.poseIdle,
  writing:  styles.poseWriting,
  thinking: styles.poseThinking,
  success:  styles.poseSuccess,
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * MimirHint
 * ---------
 * Маскот Мімір з підказкою дня. Три режими: Мудрий / Дотепний / Темний.
 * Режим зберігається в uiStore (persist). Підказка ротується щодня.
 *
 * @param pose    - яку позу показати (default: 'idle')
 * @param textKey - override тексту замість щоденної підказки
 */
interface MimirHintProps {
  pose?: MimirPose
  textKey?: string
}

const MimirHint: React.FC<MimirHintProps> = ({ pose = 'idle', textKey }) => {
  const { mimirMode, setMimirMode } = useUiStore()

  const hint = useMemo(() => {
    if (textKey) return textKey
    return getDailyHint(HINTS[mimirMode])
  }, [mimirMode, textKey])

  return (
    <div className={styles.root}>
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
        </div>
      </div>

      <div className={styles.modes}>
        {MODES.map(m => (
          <button
            key={m}
            type="button"
            className={`${styles.modeBtn} ${mimirMode === m ? styles.modeBtnOn : ''}`}
            onClick={() => setMimirMode(m)}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>
    </div>
  )
}

export default MimirHint
