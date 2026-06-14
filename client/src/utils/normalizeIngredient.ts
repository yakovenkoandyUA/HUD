import type { IngredientItem } from '../types'

const UNIT_RE = /^(\d+(?:[.,]\d+)?)\s*(кг|г|л|мл|шт|ч\.л\.|ст\.л\.)\s+(.+)$/i
const NUM_RE  = /^(\d+(?:[.,]\d+)?)\s+(.+)$/

/**
 * Normalizes a raw ingredient value (legacy string or structured object) to IngredientItem.
 * Legacy strings like "200г борошна" or "2 яйця" are parsed into name/amount/unit.
 */
export function normalizeIngredient(raw: string | IngredientItem): IngredientItem {
  if (typeof raw !== 'string') return raw

  const str = raw.trim()
  const m = str.match(UNIT_RE)
  if (m) return { amount: m[1], unit: m[2], name: m[3].trim() }

  const m2 = str.match(NUM_RE)
  if (m2) return { amount: m2[1], unit: 'шт', name: m2[2].trim() }

  return { name: str, amount: '', unit: '' }
}
