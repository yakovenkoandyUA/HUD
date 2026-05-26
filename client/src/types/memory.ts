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
}

/**
 * Memory
 * ------
 * Подія-спогад з набором фотографій.
 */
export interface Memory {
  id: string
  title: string
  location?: string
  date: string
  coverUrl: string
  photos: MemoryPhoto[]
  createdAt: string
}
