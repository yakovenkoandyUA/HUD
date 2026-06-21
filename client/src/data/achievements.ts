import type { DoodleVariant } from '../components/ui/DoodleIllustration'

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
  /** Минулий час — для бейджа/святкової картки після розблокування */
  description: string
  /** Наказовий спосіб — для тізера "спробуй" на Dashboard, поки не розблоковано */
  hint: string
  /** Куди веде тап на тізер */
  route: string
  color: string
  /** Власна іконка вузла на стежці — окрема для кожної ачівки, не загальний трофей */
  illustration: DoodleVariant
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-transaction',
    title: 'Перша монета',
    description: 'Додав свою першу транзакцію у Фінансах',
    hint: 'Додай свою першу транзакцію у Фінансах',
    route: '/finance',
    color: 'var(--accent)',
    illustration: 'finance',
  },
  {
    id: 'first-quest',
    title: 'Перший крок',
    description: 'Створив свій перший квест у Спринті',
    hint: 'Створи свій перший квест у Спринті',
    route: '/sprint',
    color: 'var(--gold)',
    illustration: 'sprint',
  },
  {
    id: 'first-recipe-cooked',
    title: 'Шеф-початківець',
    description: 'Приготував перший рецепт',
    hint: 'Познач рецепт як приготований',
    route: '/recipes',
    color: 'var(--second)',
    illustration: 'recipes',
  },
  {
    id: 'first-watchlist',
    title: 'Кінокритик',
    description: 'Додав перший фільм чи серіал у список',
    hint: 'Додай перший фільм чи серіал у список',
    route: '/watchlist',
    color: 'var(--orange, var(--accent))',
    illustration: 'watchlist',
  },
  {
    id: 'first-memory',
    title: 'Колекціонер моментів',
    description: 'Зберіг свій перший спогад',
    hint: 'Збережи свій перший спогад',
    route: '/memories',
    color: 'var(--negative)',
    illustration: 'memories',
  },
  {
    id: 'theme-changed',
    title: 'Стиль вирішує',
    description: 'Змінив тему оформлення застосунку',
    hint: 'Зміни тему оформлення застосунку',
    route: '/profile?tab=me&section=appearance',
    color: 'var(--text)',
    illustration: 'theme',
  },
  {
    id: 'first-prediction',
    title: 'Аналітик',
    description: 'Зробив свій перший прогноз на гонку F1',
    hint: 'Зроби свій перший прогноз на гонку F1',
    route: '/f1',
    color: 'var(--second)',
    illustration: 'racing',
  },
  {
    id: 'family-linked',
    title: 'Не сам',
    description: "Зʼєднав профіль із сімейним учасником",
    hint: "Зʼєднай профіль із сімейним учасником",
    route: '/profile?tab=me&section=family',
    color: 'var(--accent)',
    illustration: 'family',
  },
]

export const ACHIEVEMENTS_BY_ID: Record<string, Achievement> =
  Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]))
