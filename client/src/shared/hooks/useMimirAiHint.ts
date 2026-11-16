import { useState, useEffect } from 'react'
import { useUiStore, type MimirMode, type MimirFrequency } from '@/shared/store/uiStore'
import { authFetch } from '@/shared/services/api'

export type TimeSlot = 'morning' | 'afternoon' | 'evening'

export interface MimirHintResult {
  text: string
  pose: string
  slot: TimeSlot
  showUpgrade: boolean
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

function currentSlot(now: Date): TimeSlot {
  const h = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Kyiv', hour: '2-digit', hourCycle: 'h23',
  }).format(now))
  if (h >= 6  && h < 12) return 'morning'
  if (h >= 12 && h < 18) return 'afternoon'
  return 'evening'
}

// ── Session storage keys ──────────────────────────────────────────────────────

function windowKey(userId: string, now: Date): string {
  const date = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
  return `mimir-shown-${userId}-${date}`
}

// ── Whether to show at all based on frequency ─────────────────────────────────

function shouldShowNow(frequency: MimirFrequency, key: string, slot: TimeSlot): boolean {
  if (frequency === 'silent') return false
  if (sessionStorage.getItem(`${key}-${slot}`) === '1') return false
  if (frequency === 'balanced') {
    const anyShownToday = (['morning', 'afternoon', 'evening'] as TimeSlot[])
      .some(s => sessionStorage.getItem(`${key}-${s}`) === '1')
    if (anyShownToday) return false
  }
  return true
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useMimirAiHint
 * --------------
 * Fetches a contextual Mimir hint when the dashboard can display it.
 * Respects mimirFrequency:
 *   - silent    → never fetches, returns null
 *   - balanced  → one AI call per day (first slot only)
 *   - active    → one AI call per time slot (up to 3/day)
 *
 * Falls back to static hints if the fetch fails.
 * Returns null if nothing should be shown right now.
 */
export function useMimirAiHint(userId: string, enabled: boolean): {
  hint: MimirHintResult | null
  loading: boolean
  markShown: () => void
} {
  const { mimirMode, mimirFrequency } = useUiStore()
  const now = new Date()
  const slot = currentSlot(now)
  const shownKey = windowKey(userId, now)
  const requestKey = `${shownKey}:${slot}:${mimirMode}:${mimirFrequency}`
  const canLoad = enabled && !!userId && mimirFrequency !== 'silent'
  const [result, setResult] = useState<{ key: string; hint: MimirHintResult | null } | null>(null)
  const hint = canLoad && result?.key === requestKey ? result.hint : null

  useEffect(() => {
    if (!canLoad) return
    let cancelled = false

    const load = async () => {
      if (!shouldShowNow(mimirFrequency, shownKey, slot)) {
        if (!cancelled) setResult({ key: requestKey, hint: null })
        return
      }

      let nextHint: MimirHintResult = { text: getStaticHint(mimirMode), pose: 'idle', slot, showUpgrade: false }
      try {
        const res = await authFetch(`/api/mimir/hint?mode=${mimirMode}`, { signal: AbortSignal.timeout(8500) })
        if (res.ok) {
          const data = await res.json() as { text: string; pose: string; slot: TimeSlot }
          nextHint = { ...data, showUpgrade: false }
        } else if (res.status === 403) {
          nextHint.showUpgrade = true
        }
      } catch { /* keep the static fallback */ }
      if (!cancelled) setResult({ key: requestKey, hint: nextHint })
    }

    load()
    return () => { cancelled = true }
  }, [canLoad, mimirMode, mimirFrequency, requestKey, shownKey, slot])

  const markShown = () => {
    if (hint) sessionStorage.setItem(`${shownKey}-${hint.slot}`, '1')
  }

  return { hint, loading: canLoad && result?.key !== requestKey, markShown }
}
