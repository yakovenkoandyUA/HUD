import type { SpaceType } from '@/features/memories/store/spacesStore'

export interface SpaceTemplate {
  id:          string
  label:       string
  type:        SpaceType
  color:       string
  defaultName: string
  description: string
}

export const SPACE_TEMPLATES: SpaceTemplate[] = [
  {
    id: 'trip', label: 'Поїздка', type: 'trip', color: '#3498db',
    defaultName: 'Нова поїздка',
    description: 'Маршрут, місця, витрати',
  },
  {
    id: 'vehicle', label: 'Авто', type: 'vehicle', color: '#607d8b',
    defaultName: 'Мій автомобіль',
    description: 'ТО, заправки, документи',
  },
  {
    id: 'home', label: 'Дім', type: 'home', color: '#795548',
    defaultName: 'Наш дім',
    description: 'Ремонти, оплати, документи',
  },
  {
    id: 'pet', label: 'Улюбленець', type: 'pet', color: '#ff7043',
    defaultName: 'Мій улюбленець',
    description: 'Ветеринар, щеплення, догляд',
  },
  {
    id: 'sports', label: 'Спорт', type: 'sports', color: '#2ecc71',
    defaultName: 'Тренування',
    description: 'Результати й прогрес',
  },
]
