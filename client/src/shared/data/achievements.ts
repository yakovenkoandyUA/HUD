import type { DoodleVariant } from '@/shared/components/ui/DoodleIllustration'
import { ACHIEVEMENT_BY_ID } from '@/features/achievements/data'

/**
 * achievements.ts
 * ---------------
 * Статичний каталог "тізер"-досягнень MIMIR — 12 флагманських віх (по одній
 * на фічу), використовується лише для Dashboard-тізера "СПРОБУЙ".
 * Джерело істини для рун/рівнів — `@/features/achievements/data` (50 ачівок);
 * `reward` тут задається лише для 7 ідентифікаторів що не мають відповідника
 * в тому каталозі (решта 5 — ті самі id що і в rich-каталозі, reward береться звідти).
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
  /** Тільки для id відсутніх в rich-каталозі — див. getAchievementReward() */
  reward?: number
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
    reward: 10,
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
    reward: 10,
  },
  {
    id: 'first-prediction',
    title: 'Аналітик',
    description: 'Зробив свій перший прогноз на гонку F1',
    hint: 'Зроби свій перший прогноз на гонку F1',
    route: '/f1',
    color: 'var(--second)',
    illustration: 'racing',
    reward: 10,
  },
  {
    id: 'family-linked',
    title: 'Не сам',
    description: "Зʼєднав профіль із учасником спільного простору",
    hint: "Зʼєднай профіль із іншим учасником",
    route: '/profile?tab=me&section=family',
    color: 'var(--accent)',
    illustration: 'family',
    reward: 15,
  },
  {
    id: 'first-note',
    title: 'Думка на пам\'ять',
    description: 'Зберіг свою першу нотатку',
    hint: 'Збережи свою першу нотатку',
    route: '/notes',
    color: 'var(--text2)',
    illustration: 'notes',
    reward: 10,
  },
  {
    id: 'first-goal',
    title: 'Скарбничка',
    description: 'Створив свою першу ціль накопичення',
    hint: 'Створи ціль накопичення у Фінансах',
    route: '/finance',
    color: 'var(--positive)',
    illustration: 'goal',
  },
  {
    id: 'first-mood',
    title: 'Щирість',
    description: 'Зафіксував свій перший настрій дня',
    hint: 'Зафіксуй свій настрій дня в "Моєму дні"',
    route: '/',
    color: 'var(--negative)',
    illustration: 'mood',
    reward: 10,
  },
  {
    id: 'streak-7',
    title: 'Тиждень без пропусків',
    description: 'Виконував звичку 7 днів поспіль',
    hint: 'Виконуй будь-яку звичку 7 днів поспіль',
    route: '/sprint',
    color: 'var(--gold)',
    illustration: 'streak',
    reward: 20,
  },
]

export const ACHIEVEMENTS_BY_ID: Record<string, Achievement> =
  Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]))

/**
 * Єдина точка правди для нарахування рун — rich-каталог (`ACHIEVEMENT_BY_ID`)
 * має пріоритет, легасі `reward` використовується лише для 7 id що не мають
 * відповідника в rich-каталозі.
 */
export function getAchievementReward(id: string): number {
  return ACHIEVEMENT_BY_ID[id]?.reward ?? ACHIEVEMENTS_BY_ID[id]?.reward ?? 0
}

/** Кількість унікальних ачівок в обох каталогах разом (для "X / Y ВІДКРИТО") */
export const TOTAL_ACHIEVEMENT_COUNT = new Set([
  ...Object.keys(ACHIEVEMENT_BY_ID),
  ...ACHIEVEMENTS.map(a => a.id),
]).size
