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
    id: 'trip', label: 'Подорож', type: 'trip', color: '#3498db',
    defaultName: 'Нова подорож',
    description: 'Маршрут, місця, витрати',
  },
  {
    id: 'vehicle', label: 'Авто', type: 'vehicle', color: '#607d8b',
    defaultName: 'Мій автомобіль',
    description: 'ТО, заправки, документи',
  },
  {
    id: 'plant', label: 'Рослина', type: 'plant', color: '#16a34a',
    defaultName: 'Моя рослина',
    description: 'Полив, добрива, ідентифікація',
  },
  {
    id: 'pet', label: 'Вихованець', type: 'pet', color: '#ff7043',
    defaultName: 'Мій вихованець',
    description: 'Ветеринар, щеплення, догляд',
  },
  {
    id: 'sports', label: 'Спорт', type: 'sports', color: '#2ecc71',
    defaultName: 'Тренування',
    description: 'Результати й прогрес',
  },
]
