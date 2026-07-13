import type { SpaceType } from '@/features/memories/store/spacesStore'

export interface SpaceTypeConfig {
  label:       string
  description: string
  color:       string
  iconSrc:     string
}

const BASE = '/mimir_space_icons_svg'

export const SPACE_TYPE_CONFIG: Record<SpaceType, SpaceTypeConfig> & { blank: SpaceTypeConfig } = {
  trip:    { label: 'Поїздка',    description: 'Маршрут, місця, витрати',     color: '#3b82f6', iconSrc: `${BASE}/travel-route.svg`   },
  vehicle: { label: 'Авто',       description: 'ТО, заправки, документи',     color: '#64748b', iconSrc: `${BASE}/vehicle-car.svg`    },
  home:    { label: 'Дім',        description: 'Ремонти, оплати, документи',  color: '#92400e', iconSrc: `${BASE}/home-house.svg`     },
  pet:     { label: 'Улюбленець', description: 'Ветеринар, щеплення, догляд', color: '#ea580c', iconSrc: `${BASE}/pet-paw.svg`       },
  sports:  { label: 'Спорт',      description: 'Результати й прогрес',        color: '#16a34a', iconSrc: `${BASE}/sport-trophy.svg`  },
  shared:  { label: 'Спільний',   description: 'Спільний простір',            color: '#64748b', iconSrc: `${BASE}/friends-users.svg` },
  blank:   { label: 'Порожній',   description: 'Почати з нуля',               color: '#71717a', iconSrc: `${BASE}/blank-plus-dashed.svg` },
}
