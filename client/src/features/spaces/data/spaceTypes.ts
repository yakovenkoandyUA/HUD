import type { SpaceType } from '@/features/memories/store/spacesStore'

export interface SpaceTypeConfig {
  label:       string
  description: string
  color:       string
  iconSrc:     string
  /** Якщо true — зображення розтягується на весь блок (object-fit: cover), не центрується як емблема */
  isCover?:    boolean
}

const BASE = '/space-identifiers-transparent'

export const SPACE_TYPE_CONFIG: Record<SpaceType, SpaceTypeConfig> & { blank: SpaceTypeConfig } = {
  trip:    { label: 'Поїздка',    description: 'Маршрут, місця, витрати',     color: '#3b82f6', iconSrc: `${BASE}/space_navigation.png`, isCover: true                         },
  vehicle: { label: 'Авто',       description: 'ТО, заправки, документи',     color: '#64748b', iconSrc: `${BASE}/stylized_car_emblem_with_earthy_accents-transparent.png`          },
  home:    { label: 'Дім',        description: 'Ремонти, оплати, документи',  color: '#92400e', iconSrc: `${BASE}/elegant_house_emblem_with_botanical_frame-transparent.png`        },
  pet:     { label: 'Улюбленець', description: 'Ветеринар, щеплення, догляд', color: '#ea580c', iconSrc: `${BASE}/elegant_paw_print_with_botanical_frame-transparent.png`           },
  sports:  { label: 'Спорт',      description: 'Результати й прогрес',        color: '#16a34a', iconSrc: `${BASE}/decorative_trophy_emblem_with_botanical_frame-transparent.png`    },
  shared:  { label: 'Спільний',   description: 'Спільний простір',            color: '#64748b', iconSrc: `${BASE}/intertwined_figures_in_ornate_emblem-transparent.png`             },
  blank:   { label: 'Власний',    description: 'Свій простір з нуля',         color: '#71717a', iconSrc: `${BASE}/elegant_botanical_crest_with_plus_symbol-transparent.png`         },
}
