import type { RadarAxis } from '@/shared/components/ui/RadarChart'
import type { MoodProfile } from '@/shared/types'

export const MOOD_AXES: RadarAxis[] = [
  { key: 'humor',      label: 'ГУМОР' },
  { key: 'tension',    label: 'НАПРУГА' },
  { key: 'romance',    label: 'РОМАНТИКА' },
  { key: 'action',     label: 'ЕКШН' },
  { key: 'drama',      label: 'ДРАМА' },
  { key: 'atmosphere', label: 'АТМОСФЕРНІСТЬ' },
]

export const DEFAULT_MOOD_PROFILE: MoodProfile = {
  humor: 0,
  tension: 0,
  romance: 0,
  action: 0,
  drama: 0,
  atmosphere: 0,
}
