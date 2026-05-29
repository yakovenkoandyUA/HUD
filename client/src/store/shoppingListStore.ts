import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Recipe } from '../types'

export interface ShoppingItem {
  id: string
  name: string
  amount: number
  unit: string
  recipeId: string
  recipeName: string
  checked: boolean
}

interface ShoppingListState {
  items: ShoppingItem[]
  addFromRecipe: (recipe: Recipe, servings: number) => void
  addManual: (name: string, amount: number, unit: string) => void
  toggleItem: (id: string) => void
  removeItem: (id: string) => void
  clearAll: () => void
  clearChecked: () => void
}

const UNIT_RE = /^(\d+(?:[.,]\d+)?)\s*(кг|г|л|мл|шт|ч\.л\.|ст\.л\.)\s*(.+)?$/i
const NUM_RE  = /^(\d+(?:[.,]\d+)?)\s+(.+)$/

function parseIngredient(
  str: string,
  factor: number,
): { name: string; amount: number; unit: string } {
  const m = str.trim().match(UNIT_RE)
  if (m) {
    const raw = parseFloat(m[1].replace(',', '.')) * factor
    return {
      amount: Math.round(raw * 10) / 10,
      unit:   m[2],
      name:   (m[3] ?? '').trim() || str.trim(),
    }
  }
  const m2 = str.trim().match(NUM_RE)
  if (m2) {
    const raw = parseFloat(m2[1].replace(',', '.')) * factor
    return { amount: Math.round(raw * 10) / 10, unit: 'шт', name: m2[2].trim() }
  }
  return { amount: 1, unit: 'шт', name: str.trim() }
}

export const useShoppingListStore = create<ShoppingListState>()(
  persist(
    (set, get) => ({
      items: [],

      addFromRecipe: (recipe, servings) => {
        const factor = recipe.servings ? servings / recipe.servings : 1
        const parsed = recipe.ingredients.map(s => parseIngredient(s, factor))

        set(s => {
          const next = [...s.items]
          for (const p of parsed) {
            const key = p.name.toLowerCase().trim()
            const idx = next.findIndex(
              it => it.name.toLowerCase().trim() === key && it.recipeId === recipe.id,
            )
            if (idx >= 0) {
              next[idx] = { ...next[idx], amount: p.amount, checked: false }
            } else {
              next.push({
                id:          crypto.randomUUID(),
                name:        p.name,
                amount:      p.amount,
                unit:        p.unit,
                recipeId:    recipe.id,
                recipeName:  recipe.title,
                checked:     false,
              })
            }
          }
          return { items: next }
        })
      },

      addManual: (name, amount, unit) => {
        set(s => ({
          items: [
            ...s.items,
            {
              id:         crypto.randomUUID(),
              name:       name.trim(),
              amount,
              unit,
              recipeId:   'manual',
              recipeName: 'Вручну',
              checked:    false,
            },
          ],
        }))
      },

      toggleItem: (id) => {
        set(s => ({
          items: s.items.map(it => it.id === id ? { ...it, checked: !it.checked } : it),
        }))
      },

      removeItem: (id) => {
        set(s => ({ items: s.items.filter(it => it.id !== id) }))
      },

      clearAll: () => set({ items: [] }),

      clearChecked: () => {
        set(s => ({ items: s.items.filter(it => !it.checked) }))
      },
    }),
    { name: 'shopping-list-storage' },
  ),
)
