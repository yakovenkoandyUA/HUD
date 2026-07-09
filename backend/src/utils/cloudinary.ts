/**
 * destroyImages
 * -------------
 * Видаляє масив ресурсів з Cloudinary через Admin API (Basic auth).
 * Обробляє пакетами по 100 (ліміт Cloudinary).
 * Silently no-ops якщо env-змінні не задані або масив порожній.
 */
export async function destroyImages(publicIds: string[]): Promise<void> {
  const filtered = publicIds.filter(Boolean)
  if (!filtered.length) return

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return

  const credentials = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64')

  for (let i = 0; i < filtered.length; i += 100) {
    const batch = filtered.slice(i, i + 100)
    const params = batch.map(id => `public_ids[]=${encodeURIComponent(id)}`).join('&')
    await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/resources/image/upload?${params}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Basic ${credentials}` },
      },
    ).catch(err => console.error('[Cloudinary] destroy error:', err))
  }
}
