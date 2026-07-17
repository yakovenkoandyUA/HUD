export interface ChangelogEntry {
  version: string
  date: string
  notes: string[]
}

export const APP_VERSION = '1.1.0'

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.0',
    date: '2026-07-17',
    notes: [
      'Watchlist: виправлено підрахунок переглянутих серій у статистиці',
      'Книги: зрозуміле повідомлення коли Google Books тимчасово недоступний',
      'Профіль: журнал змін + кнопка оновлення в меню',
    ],
  },
]
