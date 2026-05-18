export type ExpenseCategory =
  | 'кава'
  | 'продукти'
  | 'таксі'
  | 'метро'
  | 'транспорт'
  | 'фібі'
  | 'коська'
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

export type TodoPriority = 'urgent' | 'normal' | 'low'

export interface TodoItem {
  id: string
  title: string
  priority: TodoPriority
  done: boolean
  dueDate?: string
}
