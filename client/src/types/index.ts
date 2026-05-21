export type Theme = 'retro' | 'warm' | 'dark' | 'japan'

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
  targetAmount: number
  savedAmount: number
}

export type TodoPriority = 'urgent' | 'normal' | 'low'

export interface TodoItem {
  id: string
  title: string
  priority: TodoPriority
  done: boolean
  dueDate?: string
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
