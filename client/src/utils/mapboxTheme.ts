import type { Theme } from '../store/uiStore'

const DARK_THEMES: Theme[] = ['velvet', 'cyber', 'noir', 'arctic']

/**
 * getLightPresetForTheme
 * -----------------------
 * Mapbox Standard style light preset ('day' | 'night') що відповідає
 * темній/світлій палітрі поточної теми застосунку.
 */
export function getLightPresetForTheme(theme: Theme): 'day' | 'night' {
  return DARK_THEMES.includes(theme) ? 'night' : 'day'
}
