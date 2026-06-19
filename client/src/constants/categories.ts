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
}

export const INCOME_CATEGORIES: IncomeCategory[] = [
  { id: 'зарплата',     label: 'Зарплата',     icon: 'ti-briefcase'     },
  { id: 'фріланс',      label: 'Фріланс',       icon: 'ti-device-laptop' },
  { id: 'інвестиції',   label: 'Інвестиції',    icon: 'ti-trending-up'   },
  { id: 'заощадження',  label: 'Заощадження',   icon: 'ti-piggy-bank'    },
  { id: 'подарунок',    label: 'Подарунок',     icon: 'ti-gift'          },
  { id: 'інше',         label: 'Інше',          icon: 'ti-dots'          },
]
