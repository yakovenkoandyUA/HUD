export interface ChangelogEntry {
  version: string
  date: string
  notes: string[]
}

export const APP_VERSION = '1.3.0'

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.3.0',
    date: '2026-08-17',
    notes: [
      'Книги: імпорт з Goodreads (CSV) — автор, ISBN, кількість сторінок',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-08-14',
    notes: [
      'Тарифи Duo/Group: тепер один платить за всіх — запрошені учасники отримують план безкоштовно',
      'Watchlist: іконка "дивились разом" біля року на картці',
      'Аніме: пошук через AniList з фолбеком на TMDB, якщо нічого не знайдено',
      'Настрій фільму/серіалу і смак напою — той самий radar-графік для оцінки',
    ],
  },
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
