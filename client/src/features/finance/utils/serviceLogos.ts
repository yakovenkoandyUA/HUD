export const KNOWN_SERVICES: Record<string, string> = {
  netflix:          'netflix.com',
  spotify:          'spotify.com',
  youtube:          'youtube.com',
  'youtube premium':'youtube.com',
  'apple music':    'music.apple.com',
  'apple tv':       'tv.apple.com',
  icloud:           'icloud.com',
  'google one':     'one.google.com',
  amazon:           'amazon.com',
  'amazon prime':   'amazon.com',
  disney:           'disneyplus.com',
  'disney+':        'disneyplus.com',
  hbo:              'hbomax.com',
  twitch:           'twitch.tv',
  discord:          'discord.com',
  notion:           'notion.so',
  figma:            'figma.com',
  github:           'github.com',
  chatgpt:          'openai.com',
  claude:           'anthropic.com',
  midjourney:       'midjourney.com',
  playstation:      'playstation.com',
  xbox:             'xbox.com',
  nintendo:         'nintendo.com',
  київстар:         'kyivstar.ua',
  vodafone:         'vodafone.ua',
  lifecell:         'lifecell.ua',
  lanet:            'lanet.ua',
  patreon:          'patreon.com',
}

export function getServiceLogoUrl(name: string): string | null {
  const domain = KNOWN_SERVICES[name.toLowerCase().trim()]
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null
}

export function getServiceEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('музик') || n.includes('music')) return '🎵'
  if (n.includes('відео') || n.includes('video') || n.includes('tv')) return '🎬'
  if (n.includes('гр') || n.includes('game')) return '🎮'
  if (n.includes('хмар') || n.includes('cloud') || n.includes('storage')) return '☁️'
  if (n.includes("зв'яз") || n.includes('мобіл')) return '📱'
  return '💳'
}
