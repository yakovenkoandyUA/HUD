import { useState, useEffect, useRef } from 'react'
import { useUiStore, type MimirMode, type MimirFrequency } from '@/shared/store/uiStore'
import { authFetch } from '@/shared/services/api'

export type TimeSlot = 'morning' | 'afternoon' | 'evening'

export interface MimirHintResult {
  text: string
  pose: string
  slot: TimeSlot
  isAi: boolean
}

// ── Static fallback hints per mode ────────────────────────────────────────────

const STATIC: Record<MimirMode, string[]> = {
  wise: [
    'Криниця пам\'яті не переповнюється. Лише збагачується.',
    'Що не записане — те не сталось. Що записане — живе вічно.',
    'Дисципліна — це не обмеження. Це форма поваги до себе.',
    'Навіть найменший план краще за найбільший намір.',
    'Пам\'ять — єдине майно, яке не можна вкрасти.',
    'Найкращий момент почати — зараз.',
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

function getStaticHint(mode: MimirMode): string {
  const hints = STATIC[mode]
  const day = new Date().toDateString()
  let hash = 0
  for (let i = 0; i < day.length; i++) hash = (hash * 31 + day.charCodeAt(i)) & 0xffffffff
  return hints[Math.abs(hash) % hints.length]
}

// ── Time slot ─────────────────────────────────────────────────────────────────

function currentSlot(): TimeSlot {
  const h = new Date().getHours()
  if (h >= 6  && h < 12) return 'morning'
  if (h >= 12 && h < 18) return 'afternoon'
  return 'evening'
}

// ── Session storage keys ──────────────────────────────────────────────────────

function shownKey(slot: TimeSlot): string {
  return `mimir-shown-${new Date().toDateString()}-${slot}`
}

function isSlotShownToday(slot: TimeSlot): boolean {
  return sessionStorage.getItem(shownKey(slot)) === '1'
}

function markSlotShown(slot: TimeSlot): void {
  sessionStorage.setItem(shownKey(slot), '1')
}

// ── Whether to show at all based on frequency ─────────────────────────────────

function shouldShowNow(frequency: MimirFrequency): boolean {
  if (frequency === 'silent') return false
  const slot = currentSlot()
  if (isSlotShownToday(slot)) return false
  if (frequency === 'balanced') {
    // only morning slot counts as "once per day"
    const anyShownToday = (['morning', 'afternoon', 'evening'] as TimeSlot[])
      .some(s => sessionStorage.getItem(shownKey(s)) === '1')
    if (anyShownToday) return false
  }
  return true
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useMimirAiHint
 * --------------
 * Fetches an AI-generated Mimir hint from the backend (Haiku + context).
 * Respects mimirFrequency:
 *   - silent    → never fetches, returns null
 *   - balanced  → one AI call per day (first slot only)
 *   - active    → one AI call per time slot (up to 3/day)
 *
 * Falls back to static hints if the fetch fails or frequency is silent.
 * Returns null if nothing should be shown right now.
 */
export function useMimirAiHint(): {
  hint: MimirHintResult | null
  loading: boolean
  markShown: () => void
} {
  const { mimirMode, mimirFrequency } = useUiStore()
  const [hint, setHint]       = useState<MimirHintResult | null>(null)
  const [loading, setLoading] = useState(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    let cancelled = false
    const slot = currentSlot()

    const load = async () => {
      if (!shouldShowNow(mimirFrequency)) return

      setLoading(true)

      // silent → no fetch (already handled above, but be safe)
      if (mimirFrequency === 'silent') {
        setLoading(false)
        return
      }

      try {
        const res = await authFetch(`/api/mimir/hint?mode=${mimirMode}`)
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json() as { text: string; pose: string; slot: TimeSlot }
            setHint({ text: data.text, pose: data.pose, slot: data.slot, isAi: true })
          } else {
            // fallback to static
            setHint({ text: getStaticHint(mimirMode), pose: 'idle', slot, isAi: false })
          }
        }
      } catch {
        if (!cancelled) {
          setHint({ text: getStaticHint(mimirMode), pose: 'idle', slot, isAi: false })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [mimirMode, mimirFrequency])

  const markShown = () => {
    const slot = currentSlot()
    markSlotShown(slot)
    setHint(null)
  }

  return { hint, loading, markShown }
}
