async function _upload(file: File, folder: string): Promise<{ secure_url: string; public_id: string }> {
  const cloudName    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) throw new Error('Cloudinary env variables not set')

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', folder)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData },
  )

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}))
    console.error('[Cloudinary] error body:', errBody)
    throw new Error(`Cloudinary ${response.status}: ${(errBody as { error?: { message?: string } })?.error?.message ?? JSON.stringify(errBody)}`)
  }

  return response.json() as Promise<{ secure_url: string; public_id: string }>
}

/**
 * uploadToCloudinary
 * ------------------
 * Завантажує файл на Cloudinary, повертає тільки secure_url.
 *
 * @param {File}   file   — файл для завантаження
 * @param {string} folder — папка в Cloudinary
 * @returns {Promise<string>} — secure_url
 */
export async function uploadToCloudinary(file: File, folder: string = 'mimir'): Promise<string> {
  const data = await _upload(file, folder)
  return data.secure_url
}

/**
 * uploadToCloudinaryFull
 * ----------------------
 * Як uploadToCloudinary, але повертає і URL, і public_id (для cleanup).
 *
 * @param {File}   file   — файл для завантаження
 * @param {string} folder — папка в Cloudinary
 * @returns {Promise<{ url: string; publicId: string }>}
 */
export async function uploadToCloudinaryFull(
  file: File,
  folder: string = 'mimir',
): Promise<{ url: string; publicId: string }> {
  const data = await _upload(file, folder)
  return { url: data.secure_url, publicId: data.public_id }
}
