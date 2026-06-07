export type Theme = 'retro' | 'warm' | 'dark' | 'japan' | 'heroes'

export type ExpenseCategory =
  | 'кава'
  | 'продукти'
  | 'таксі'
  | 'метро'
  | 'транспорт'
  | 'фібі'
  | 'інше'
  | 'накопичення'

export interface Transaction {
  id: string
  type: 'topup' | 'expense'
  amount: number
  description: string
  title?: string
  date: string
  category?: ExpenseCategory
  createdAt?: string
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
  imageUrl?: string
  deposits?: { amount: number; date: string }[]
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
  category?: string | null
  // Rich card fields (local-only, not synced to backend)
  description?: string
  dueDate?: string
  labels?: SprintLabel[]
  checklist?: ChecklistItem[]
  recipeImageUrl?: string
  recipeId?: string
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  repeatDay?: number
  nextDue?: string
  repeatConfig?: RepeatConfig
  repeatStartDate?: string
  completionLog?: string[]  // 'YYYY-MM-DD' entries, local-only
  reminder?: {
    amount: number
    unit: 'minutes' | 'hours' | 'days' | 'weeks'
  }
}

export interface RepeatConfig {
  interval: number
  unit: 'day' | 'week' | 'month' | 'year'
  weekDays?: number[]        // 0=Mon..6=Sun, only for unit=week
  endsType: 'never' | 'date' | 'after'
  endsDate?: string
  endsAfter?: number
}

export type RecipeDifficulty = 'easy' | 'medium' | 'hard'

export interface Recipe {
  id: string
  title: string
  ingredients: string[]
  steps: string
  imageUrl?: string
  category?: string
  calories?: number
  difficulty?: RecipeDifficulty
  cookTime?: number
  servings?: number
  equipment?: string[]
  tags?: string[]
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
  currentSeason?: number | null
  currentEpisode?: number | null
  totalEpisodes?: number | null
  totalSeasons?: number | null
  notifyNewEpisode?: boolean
  notifyNewSeason?: boolean
  nextEpisodeDate?: string | null
  nextSeasonDate?: string | null
}
