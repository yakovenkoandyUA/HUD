/**
 * MemoryPhoto
 * -----------
 * Окрема фотографія всередині події-спогаду.
 */
export interface MemoryPhoto {
  id: string
  url: string
  caption?: string
  createdAt: string
  addedBy?: string
  addedByName?: string
}

/**
 * MemoryPlace
 * -----------
 * Заклад (кафе, ресторан, музей тощо), знайдений у місті спогаду.
 */
export interface MemoryPlace {
  id: string
  name: string
  address?: string
  lat: number
  lng: number
}

/**
 * Memory
 * ------
 * Подія-спогад з набором фотографій.
 */
export interface Memory {
  id: string
  userId: string
  title: string
  location?: string
  lat?: number | null
  lng?: number | null
  date: string
  dateEnd?: string | null
  isTrip?: boolean
  coverUrl: string
  coverAttribution?: string
  notes?: string
  tags?: string[]
  places?: MemoryPlace[]
  withProfiles?: string[]
  photos: MemoryPhoto[]
  createdAt: string
  ownerName?: string
  ownerAvatarUrl?: string | null
  spaceId?: string | null
}
