export type DrinkType = 'whisky' | 'wine' | 'beer' | 'gin' | 'rum' | 'cognac' | 'vodka' | 'liqueur' | 'other'
export type DrinkStatus = 'wishlist' | 'have' | 'finished'

export interface FlavorProfile {
  sweet: number
  smoky: number
  fruity: number
  spicy: number
  woody: number
  floral: number
}

export interface Tasting {
  _id: string
  date: string
  userId: string
  rating: number
  notes: string
  occasion: string
}

export interface Drink {
  _id: string
  name: string
  brand: string
  type: DrinkType
  country: string
  distillery: string
  abv: number | null
  photo: string
  status: DrinkStatus
  price: number | null
  rating: number | null
  notes: string
  flavor: FlavorProfile
  tastings: Tasting[]
  userId: string
  sharedWith: string[]
  createdAt: string
  updatedAt: string
}

export interface DrinkFormState {
  name: string
  brand: string
  type: DrinkType
  country: string
  distillery: string
  abv: string
  photo: string
  status: DrinkStatus
  price: string
  rating: string
  notes: string
  flavor: FlavorProfile
}

export const DRINK_TYPE_LABELS: Record<DrinkType, string> = {
  whisky: 'Віскі',
  wine: 'Вино',
  beer: 'Пиво',
  gin: 'Джин',
  rum: 'Ром',
  cognac: 'Коньяк',
  vodka: 'Горілка',
  liqueur: 'Лікер',
  other: 'Інше',
}

export const DRINK_STATUS_LABELS: Record<DrinkStatus, string> = {
  wishlist: 'Хочу спробувати',
  have: 'Є вдома',
  finished: 'Скуштовано',
}

export const DEFAULT_FLAVOR: FlavorProfile = {
  sweet: 0,
  smoky: 0,
  fruity: 0,
  spicy: 0,
  woody: 0,
  floral: 0,
}
