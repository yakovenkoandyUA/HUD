import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Goal } from '../types'
import { getToken, authFetch, isBackendConfigured } from '../services/api'

interface ApiGoal {
  _id: string
  title: string
  emoji: string
  targetAmount: number
  currentAmount: number
  deadline: string
}

function fromApi(raw: ApiGoal): Goal {
  return {
    id: raw._id,
    title: raw.title,
    emoji: raw.emoji || '🎯',
    targetAmount: raw.targetAmount,
    currentAmount: raw.currentAmount,
    deadline: raw.deadline || '',
  }
}

interface GoalsState {
  goals: Goal[]
  fetchGoals: () => Promise<void>
  addGoal: (title: string, targetAmount: number, emoji?: string, deadline?: string) => void
  contribute: (id: string, amount: number) => void
  deleteGoal: (id: string) => void
}

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set, get) => ({
      goals: [],

      fetchGoals: async () => {
        if (!getToken() || !isBackendConfigured()) return
        try {
          const res = await authFetch('/api/goals')
          if (!res.ok) throw new Error()
          const data: ApiGoal[] = await res.json()
          set({ goals: data.map(fromApi) })
        } catch {
          // keep local data on error
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
        if (!getToken() || !isBackendConfigured()) return
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
        if (!getToken() || !isBackendConfigured()) return
        authFetch(`/api/goals/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ currentAmount: newAmount }),
        }).catch(() => {})
      },

      deleteGoal: (id) => {
        set(s => ({ goals: s.goals.filter(g => g.id !== id) }))
        if (!getToken() || !isBackendConfigured()) return
        authFetch(`/api/goals/${id}`, { method: 'DELETE' }).catch(() => {})
      },
    }),
    { name: 'hud-goals' }
  )
)
