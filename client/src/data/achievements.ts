/**
 * achievements.ts
 * ---------------
 * Статичний каталог досягнень MIMIR — суто косметичний шар мотивації.
 * НЕ контролює доступ до жодної фічі (доступ керується boolean-флагами
 * профілю/підпискою) — лише фіксує "перші кроки" юзера і святкує їх.
 */
export interface Achievement {
  id: string
  title: string
  description: string
  color: string
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-transaction',
    title: 'Перша монета',
    description: 'Додав свою першу транзакцію у Фінансах',
    color: 'var(--accent)',
  },
  {
    id: 'first-quest',
    title: 'Перший крок',
    description: 'Створив свій перший квест у Спринті',
    color: 'var(--gold)',
  },
  {
    id: 'first-recipe-cooked',
    title: 'Шеф-початківець',
    description: 'Приготував перший рецепт',
    color: 'var(--second)',
  },
  {
    id: 'first-watchlist',
    title: 'Кінокритик',
    description: 'Додав перший фільм чи серіал у список',
    color: 'var(--orange, var(--accent))',
  },
  {
    id: 'first-memory',
    title: 'Колекціонер моментів',
    description: 'Зберіг свій перший спогад',
    color: 'var(--negative)',
  },
  {
    id: 'theme-changed',
    title: 'Стиль вирішує',
    description: 'Змінив тему оформлення застосунку',
    color: 'var(--text)',
  },
  {
    id: 'first-prediction',
    title: 'Аналітик',
    description: 'Зробив свій перший прогноз на гонку F1',
    color: 'var(--second)',
  },
  {
    id: 'family-linked',
    title: 'Не сам',
    description: "Зʼєднав профіль із сімейним учасником",
    color: 'var(--accent)',
  },
]

export const ACHIEVEMENTS_BY_ID: Record<string, Achievement> =
  Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]))
