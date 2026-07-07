/**
 * appCache
 * --------
 * Версійна міграція кешу + утиліти для ручного очищення.
 *
 * CURRENT_VERSION — bump при кожній зміні що ламає сумісність.
 *
 * Версії:
 *   1 — оригінальний запуск
 *   2 — міграція hud-sprint → hud-sprint-v2
 *   3 — додано checklist/labels/dueDate/globalLabels у sprint store;
 *       очищення застарілих championship caches без версійного суфіксу
 */

const CURRENT_VERSION = 3

// Zustand stores — містять дані юзера, НІКОЛИ не чистяться автоматично
const USER_STORE_KEYS = [
  'hud-sprint-v2',
  'hud-finance',
  'hud-goals',
  'hud-ui',
  'hud-watchlist',
  'hud-lessons',
  'hud-recipes',
]

// API-кеш ключі в localStorage (безпечно очищати)
const LOCAL_API_PREFIXES = [
  'hud_nasa_apod_',   // NASA APOD — один запис на день
  'episodes_cache_',  // TMDB серіали — 24-годинний TTL
]

// API-кеш ключі в sessionStorage (безпечно очищати)
const SESSION_API_PREFIXES = [
  'hud-champ-',       // F1 championship — денний кеш
]

// ── Автоматична міграція ──────────────────────────────────────────────────────

export function runCacheMigration(): void {
  const stored = Number(localStorage.getItem('hud-cache-version') ?? '0')
  if (stored >= CURRENT_VERSION) return

  // v1 → v2: видалити старий sprint store і флаг міграції
  if (stored < 2) {
    localStorage.removeItem('hud-sprint')
    localStorage.removeItem('hud-sprint-v2-migrated')
  }

  // v2 → v3: очистити застарілі sessionStorage-кеші championship (старі ключі
  // без версійного суфіксу `v4`) та старі NASA APOD кеші (не сьогоднішній)
  if (stored < 3) {
    const today = new Date().toISOString().split('T')[0]

    for (const key of Object.keys(sessionStorage)) {
      // Зберегти тільки hud-champ-v4-*, решту видалити
      if (key.startsWith('hud-champ-') && !key.startsWith('hud-champ-v4-')) {
        sessionStorage.removeItem(key)
      }
    }

    for (const key of Object.keys(localStorage)) {
      // Зберегти тільки сьогоднішній APOD
      if (key.startsWith('hud_nasa_apod_') && key !== `hud_nasa_apod_${today}`) {
        localStorage.removeItem(key)
      }
      // Видалити episodes_cache без TTL-мітки (старий формат)
      if (key.startsWith('episodes_cache_')) {
        try {
          const raw = localStorage.getItem(key)
          if (!raw) continue
          const parsed = JSON.parse(raw)
          // Новий формат має поле `cachedAt`, старий — ні
          if (!parsed?.cachedAt) localStorage.removeItem(key)
        } catch {
          localStorage.removeItem(key)
        }
      }
    }
  }

  localStorage.setItem('hud-cache-version', String(CURRENT_VERSION))
}

// ── Ручне очищення API-кешів (зберігає дані юзера) ──────────────────────────

export function clearApiCaches(): void {
  for (const key of Object.keys(sessionStorage)) {
    if (SESSION_API_PREFIXES.some(p => key.startsWith(p))) {
      sessionStorage.removeItem(key)
    }
  }

  for (const key of Object.keys(localStorage)) {
    if (LOCAL_API_PREFIXES.some(p => key.startsWith(p))) {
      localStorage.removeItem(key)
    }
  }
}

// ── Ядерний варіант: повне скидання (стирає ВСІ дані) ───────────────────────
// Використовувати лише як останній засіб (debug / hard reset).

export function clearAllStorage(): void {
  localStorage.clear()
  sessionStorage.clear()
}

// ── Діагностика: перелік відомих ключів у сховищах ──────────────────────────

export function getStorageReport(): {
  userStores: string[]
  apiCaches: string[]
  other: string[]
  session: string[]
} {
  const allLocal = Object.keys(localStorage)
  const userStores = allLocal.filter(k => USER_STORE_KEYS.includes(k))
  const apiCaches  = allLocal.filter(k => LOCAL_API_PREFIXES.some(p => k.startsWith(p)))
  const other      = allLocal.filter(k => !userStores.includes(k) && !apiCaches.includes(k))
  const session    = Object.keys(sessionStorage)

  return { userStores, apiCaches, other, session }
}
