import { create } from 'zustand'
import type { Goal } from '@/shared/types'
import { getToken, authFetch, isBackendConfigured } from '@/shared/services/api'
import { useFinanceStore } from './financeStore'
import { useAchievementsStore } from '@/shared/store/achievementsStore'

interface ApiGoal {
  _id: string
  title: string
  emoji: string
  targetAmount: number
  currentAmount: number
  deadline: string
  imageUrl: string
  deposits: { amount: number; date: string }[]
}

function fromApi(raw: ApiGoal): Goal {
  return {
    id: raw._id,
    title: raw.title,
    emoji: raw.emoji || '🎯',
    targetAmount: raw.targetAmount,
    currentAmount: raw.currentAmount,
    deadline: raw.deadline || '',
    imageUrl: raw.imageUrl || '',
    deposits: raw.deposits || [],
  }
}

const GOALS_CACHE_KEY = 'hud-goals-v1'
const GOALS_CACHE_TTL = 5 * 60 * 1000

function readGoalsCache(): Goal[] | null {
  try {
    const raw = sessionStorage.getItem(GOALS_CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > GOALS_CACHE_TTL) return null
    return data
  } catch { return null }
}

function writeGoalsCache(goals: Goal[]) {
  try { sessionStorage.setItem(GOALS_CACHE_KEY, JSON.stringify({ data: goals, ts: Date.now() })) } catch { /* quota */ }
}

interface GoalsState {
  goals: Goal[]
  goalsLoading: boolean
  fetchGoals: () => Promise<void>
  addGoal: (title: string, targetAmount: number, emoji?: string, deadline?: string) => void
  contribute: (id: string, amount: number) => void
  updateImage: (id: string, imageUrl: string) => void
  deleteGoal: (id: string) => void
  reset: () => void
}

export const useGoalsStore = create<GoalsState>()((set, get) => ({
  goals: readGoalsCache() ?? [],
  goalsLoading: !readGoalsCache(),

  reset: () => {
    sessionStorage.removeItem(GOALS_CACHE_KEY)
    set({ goals: [], goalsLoading: true })
  },

  fetchGoals: async () => {
    if (!getToken() || !isBackendConfigured()) return
    try {
      const res = await authFetch('/api/goals')
      if (!res.ok) throw new Error()
      const data: ApiGoal[] = await res.json()
      const mapped = data.map(fromApi)
      set({ goals: mapped, goalsLoading: false })
      writeGoalsCache(mapped)
    } catch {
      set({ goalsLoading: false })
    }
  },

  addGoal: (title, targetAmount, emoji = '🎯', deadline = '') => {
    const goal: Goal = {
      id: crypto.randomUUID(),
      title,
      emoji,
      targetAmount,
      currentAmount: 0,
      deadline,
    }
    set(s => ({ goals: [...s.goals, goal] }))
    useAchievementsStore.getState().unlock('first-goal')
    authFetch('/api/goals', {
      method: 'POST',
      body: JSON.stringify({ title, emoji, targetAmount, currentAmount: 0, deadline }),
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((created: ApiGoal) => {
        set(s => ({ goals: s.goals.map(g => g.id === goal.id ? fromApi(created) : g) }))
      })
      .catch(() => {})
  },

  contribute: (id, amount) => {
    const goal = get().goals.find(g => g.id === id)
    if (!goal) return
    const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount)
    set(s => ({ goals: s.goals.map(g => g.id === id ? { ...g, currentAmount: newAmount } : g) }))
    authFetch(`/api/goals/${id}/deposit`, {
      method: 'PATCH',
      body: JSON.stringify({ amount }),
    })
      .then(r => {
        if (!r.ok) throw new Error()
        useFinanceStore.getState().addExpense(amount, `Ціль: ${goal.title}`, 'накопичення')
        return get().fetchGoals()
      })
      .catch(() => {})
  },

  updateImage: (id, imageUrl) => {
    set(s => ({ goals: s.goals.map(g => g.id === id ? { ...g, imageUrl } : g) }))
    authFetch(`/api/goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ imageUrl }),
    }).catch(() => {})
  },

  deleteGoal: (id) => {
    set(s => ({ goals: s.goals.filter(g => g.id !== id) }))
    authFetch(`/api/goals/${id}`, { method: 'DELETE' }).catch(() => {})
  },
}))
