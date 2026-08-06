import { create } from 'zustand'
import type { Recipe } from '@/shared/types'
import { normalizeIngredient } from '@/features/recipes/utils/normalizeIngredient'
import { authFetch, isBackendConfigured, getToken } from '@/shared/services/api'

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
  fetchItems: () => Promise<void>
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

interface ApiItem {
  _id: string
  name: string
  amount: number
  unit: string
  recipeId: string
  recipeName: string
  checked: boolean
}

function fromApi(item: ApiItem): ShoppingItem {
  return {
    id: item._id,
    name: item.name,
    amount: item.amount,
    unit: item.unit,
    recipeId: item.recipeId,
    recipeName: item.recipeName,
    checked: item.checked,
  }
}

// Guards against a slow fetchItems() overwriting an item added/toggled
// while it was still in flight with stale data — see spacesStore.ts.
let shoppingReqId = 0

export const useShoppingListStore = create<ShoppingListState>()((set, get) => ({
  items: [],

  fetchItems: async () => {
    if (!getToken() || !isBackendConfigured()) return
    const reqId = ++shoppingReqId
    try {
      const res = await authFetch('/api/shopping')
      if (!res.ok) return
      const data: ApiItem[] = await res.json()
      if (reqId === shoppingReqId) set({ items: data.map(fromApi) })
    } catch { /* offline */ }
  },

  addFromRecipe: (recipe, servings) => {
    const factor = recipe.servings ? servings / recipe.servings : 1
    const parsed = recipe.ingredients.map(raw => {
      const ing = normalizeIngredient(raw)
      if (ing.name && ing.amount) {
        const rawNum = parseFloat(ing.amount.replace(',', '.'))
        const scaled = isNaN(rawNum) ? 1 : Math.round(rawNum * factor * 10) / 10
        return { name: ing.name, amount: scaled, unit: ing.unit || 'шт' }
      }
      return parseIngredient(typeof raw === 'string' ? raw : ing.name, factor)
    })

    const toCreate: ShoppingItem[] = []
    const toUpdate: ShoppingItem[] = []

    shoppingReqId++
    set(s => {
      const next = [...s.items]
      for (const p of parsed) {
        const key = p.name.toLowerCase().trim()
        const idx = next.findIndex(
          it => it.name.toLowerCase().trim() === key && it.recipeId === recipe.id,
        )
        if (idx >= 0) {
          next[idx] = { ...next[idx], amount: p.amount, checked: false }
          toUpdate.push(next[idx])
        } else {
          const newItem: ShoppingItem = {
            id: crypto.randomUUID(),
            name: p.name, amount: p.amount, unit: p.unit,
            recipeId: recipe.id!, recipeName: recipe.title,
            checked: false,
          }
          next.push(newItem)
          toCreate.push(newItem)
        }
      }
      return { items: next }
    })

    if (!getToken() || !isBackendConfigured()) return

    Promise.all([
      ...toCreate.map(item =>
        authFetch('/api/shopping', {
          method: 'POST',
          body: JSON.stringify({ name: item.name, amount: item.amount, unit: item.unit, recipeId: item.recipeId, recipeName: item.recipeName }),
        })
          .then(r => r.ok ? r.json() : Promise.reject())
          .then((created: ApiItem) => set(s => ({
            items: s.items.map(i => i.id === item.id ? { ...i, id: created._id } : i),
          })))
          .catch(() => {})
      ),
      ...toUpdate.map(item =>
        authFetch(`/api/shopping/${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ amount: item.amount, checked: false }),
        }).catch(() => {})
      ),
    ])
  },

  addManual: (name, amount, unit) => {
    const item: ShoppingItem = {
      id: crypto.randomUUID(),
      name: name.trim(), amount, unit,
      recipeId: 'manual', recipeName: 'Вручну',
      checked: false,
    }
    shoppingReqId++
    set(s => ({ items: [...s.items, item] }))

    if (!getToken() || !isBackendConfigured()) return
    authFetch('/api/shopping', {
      method: 'POST',
      body: JSON.stringify({ name: item.name, amount, unit }),
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((created: ApiItem) => set(s => ({
        items: s.items.map(i => i.id === item.id ? { ...i, id: created._id } : i),
      })))
      .catch(() => {})
  },

  toggleItem: (id) => {
    const item = get().items.find(i => i.id === id)
    if (!item) return
    const checked = !item.checked
    shoppingReqId++
    set(s => ({ items: s.items.map(it => it.id === id ? { ...it, checked } : it) }))
    if (!getToken() || !isBackendConfigured()) return
    authFetch(`/api/shopping/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ checked }),
    }).catch(() => {})
  },

  removeItem: (id) => {
    shoppingReqId++
    set(s => ({ items: s.items.filter(it => it.id !== id) }))
    if (!getToken() || !isBackendConfigured()) return
    authFetch(`/api/shopping/${id}`, { method: 'DELETE' }).catch(() => {})
  },

  clearAll: () => {
    shoppingReqId++
    set({ items: [] })
    if (!getToken() || !isBackendConfigured()) return
    authFetch('/api/shopping', { method: 'DELETE' }).catch(() => {})
  },

  clearChecked: () => {
    shoppingReqId++
    set(s => ({ items: s.items.filter(it => !it.checked) }))
    if (!getToken() || !isBackendConfigured()) return
    authFetch('/api/shopping?checked=1', { method: 'DELETE' }).catch(() => {})
  },
}))
