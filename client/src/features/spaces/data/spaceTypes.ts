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

export const SPACE_TYPE_CONFIG: Record<SpaceType | 'home', SpaceTypeConfig> & { blank: SpaceTypeConfig } = {
	trip: { label: 'Поїздка', description: 'Маршрут, місця, витрати', color: '#3b82f6', iconSrc: `${BASE}/space_navigation.png`, isCover: true },
	vehicle: { label: 'Авто', description: 'ТО, заправки, документи', color: '#64748b', iconSrc: `${BASE}/space_car.png`, isCover: true },
	plant: { label: 'Рослина', description: 'Полив, добрива, ідентифікація', color: '#16a34a', iconSrc: `${BASE}/space_plants.png`, isCover: true },
	pet: { label: 'Улюбленець', description: 'Ветеринар, щеплення, догляд', color: '#ea580c', iconSrc: `${BASE}/space_pet.png`, isCover: true },
	sports: { label: 'Спорт', description: 'Результати й прогрес', color: '#16a34a', iconSrc: `${BASE}/space_sport.png`, isCover: true },
	shared: { label: 'Спільний', description: 'Спільний простір', color: '#64748b', iconSrc: `${BASE}/space_personal.png`, isCover: true },
	blank: { label: 'Свій простір', description: 'Свій простір з нуля', color: '#71717a', iconSrc: `${BASE}/space_personal.png`, isCover: true },
	home:  { label: 'Дім', description: 'Ремонти, оплати, документи', color: '#92400e', iconSrc: `${BASE}/space_house.png`, isCover: true },
}
