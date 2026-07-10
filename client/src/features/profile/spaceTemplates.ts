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
    id: 'family', label: "Сім'я", type: 'family', color: '#9b59b6',
    defaultName: "Сім'я",
    description: 'Спільні спогади й плани',
  },
  {
    id: 'friends', label: 'Друзі', type: 'friends', color: '#e91e8c',
    defaultName: 'Друзі',
    description: 'Плани й спогади разом',
  },
  {
    id: 'project', label: 'Проект', type: 'project', color: '#1abc9c',
    defaultName: 'Новий проект',
    description: 'Задачі й мілстоуни',
  },
  {
    id: 'sports', label: 'Спорт', type: 'sports', color: '#2ecc71',
    defaultName: 'Тренування',
    description: 'Результати й прогрес',
  },
  {
    id: 'hobby', label: 'Хобі', type: 'hobby', color: '#f39c12',
    defaultName: 'Хобі',
    description: 'Захоплення й прогрес',
  },
  {
    id: 'personal', label: 'Особистий', type: 'personal', color: '#e74c3c',
    defaultName: 'Особистий простір',
    description: 'Твоє — тільки для тебе',
  },
]
