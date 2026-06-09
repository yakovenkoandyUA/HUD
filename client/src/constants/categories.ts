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
