export interface BaseCategory {
  id: string
  label: string
  emoji: string
}

export const BASE_CATEGORIES: BaseCategory[] = [
  { id: 'кава',      label: 'Кава',           emoji: '☕' },
  { id: 'продукти',  label: 'Продукти',        emoji: '🛒' },
  { id: 'транспорт', label: 'Транспорт',       emoji: '🚌' },
  { id: 'фібі',      label: 'Фібі',            emoji: '🐱' },
  { id: 'їжа',       label: 'Їжа поза домом', emoji: '🍽' },
  { id: 'здоров\'я', label: 'Здоров\'я',       emoji: '💊' },
  { id: 'розваги',   label: 'Розваги',         emoji: '🎬' },
  { id: 'накопичення', label: 'Накопичення',   emoji: '🏦' },
  { id: 'інше',      label: 'Інше',            emoji: '📦' },
]

export interface IncomeCategory {
  id: string
  label: string
  icon: string
  color: string
}

export const INCOME_CATEGORIES: IncomeCategory[] = [
  { id: 'зарплата',    label: 'Зарплата',    icon: 'ti-briefcase',     color: '#22C55E' },
  { id: 'фріланс',     label: 'Фріланс',     icon: 'ti-device-laptop', color: '#8B5CF6' },
  { id: 'інвестиції',  label: 'Інвестиції',  icon: 'ti-trending-up',   color: '#3B82F6' },
  { id: 'заощадження', label: 'Заощадження', icon: 'ti-pig-money',     color: '#EAB308' },
  { id: 'подарунок',   label: 'Подарунок',   icon: 'ti-gift',          color: '#FB923C' },
  { id: 'інше',        label: 'Інше',        icon: 'ti-dots',          color: '#9CA3AF' },
]

export const INCOME_CAT_NAMES = new Set(INCOME_CATEGORIES.map(c => c.label.toLowerCase()))

/** Category names that are income-only and must be excluded from the expense form. */
export const INCOME_ONLY_NAMES = new Set(['інвестиції', 'заощадження'])
