const BASE = 'https://cdn.jsdelivr.net/npm/openmoji@15.0.0/color/svg'

/** Returns an OpenMoji SVG CDN URL for the given unicode codepoint string (e.g. '1F3AC') */
export const openmojiUrl = (unicode: string): string =>
  `${BASE}/${unicode.toUpperCase()}.svg`
