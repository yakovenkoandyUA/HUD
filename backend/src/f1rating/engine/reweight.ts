export interface ReweightInput {
  key: string
  weight: number
  available: boolean
}

/**
 * Redistributes the configured weight of unavailable (missing/insufficient-sample/excluded)
 * metrics proportionally across the available ones, so a component score is a properly
 * re-normalized weighted average of what data actually exists — never a silent zero for the
 * missing slice. If nothing is available, every effective weight is 0 and the caller must
 * treat the component as insufficient data.
 */
export function reweightComponents(items: ReweightInput[]): Record<string, number> {
  const availableItems = items.filter(i => i.available)
  const availableWeightSum = availableItems.reduce((acc, i) => acc + i.weight, 0)

  const result: Record<string, number> = {}
  for (const item of items) {
    if (!item.available || availableWeightSum <= 0) {
      result[item.key] = 0
      continue
    }
    result[item.key] = item.weight / availableWeightSum
  }
  return result
}
