export type Theme = 'retro' | 'warm' | 'dark' | 'japan' | 'heroes'

export type ExpenseCategory =
  | 'кава'
  | 'продукти'
  | 'таксі'
  | 'метро'
  | 'транспорт'
  | 'фібі'
  | 'інше'

export interface Transaction {
  id: string
  type: 'topup' | 'expense'
  amount: number
  description: string
  date: string
  category?: ExpenseCategory
}

export interface SprintTask {
  id: string
  title: string
  category: 'mentorship' | 'dev' | 'personal' | 'learning'
  done: boolean
  weekStart: string
}

export type LessonStatus = 'planned' | 'done' | 'draft'

export interface Lesson {
  id: string
  title: string
  description: string
  notes: string
  status: LessonStatus
  date: string
}

export interface Goal {
  id: string
  title: string
  emoji?: string
  targetAmount: number
  currentAmount: number
  deadline?: string
}

export type TodoPriority = 'urgent' | 'normal' | 'low'

export interface TodoItem {
  id: string
  title: string
  priority: TodoPriority
  done: boolean
  dueDate?: string
}

export type UnifiedTodoType = 'sprint' | 'shopping' | 'todo'
export type SprintTag = 'mentorship' | 'dev' | 'personal' | 'learning'

/**
 * ChecklistItem
 * -------------
 * Підзадача всередині Sprint задачі.
 */
export interface ChecklistItem {
  id: string
  title: string
  done: boolean
}

/**
 * SprintLabel
 * -----------
 * Кольорова мітка задачі.
 */
export interface SprintLabel {
  id: string
  title: string
  color: string   // hex color
}

export interface UnifiedTodo {
  id: string
  title: string
  done: boolean
  type: UnifiedTodoType
  tag?: SprintTag
  priority?: TodoPriority
  quantity?: string
  weekStart?: string
  createdAt: string
  // Rich card fields (local-only, not synced to backend)
  description?: string
  dueDate?: string
  labels?: SprintLabel[]
  checklist?: ChecklistItem[]
}

export interface MealIngredient {
  name: string
  measure: string
}

export interface Meal {
  id: string
  name: string
  category: string
  area: string
  instructions: string
  thumb: string
  ingredients: MealIngredient[]
}

export interface Recipe {
  id: string
  title: string
  ingredients: string[]
  steps: string
  imageUrl?: string
}

export type WatchlistCategory = 'movie' | 'series' | 'anime' | 'book'
export type WatchlistStatus = 'want' | 'watching' | 'watched' | 'dropped'

export interface WatchlistItem {
  id: string
  tmdbId: number
  title: string
  originalTitle: string
  category: WatchlistCategory
  status: WatchlistStatus
  posterPath: string | null
  backdropPath: string | null
  overview: string
  year: string
  genres: string[]
  rating: number | null
  seasonReminder: boolean
  reminderDate: string | null
  addedAt: string
  authors?: string[]
  pageCount?: number
  thumbnail?: string
}
