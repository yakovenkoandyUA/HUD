/**
 * uploadToCloudinary
 * ------------------
 * Завантажує файл зображення на Cloudinary через unsigned upload.
 *
 * @param {File} file         — файл для завантаження
 * @param {string} folder     — папка в Cloudinary (наприклад 'mimir/recipes')
 * @returns {Promise<string>} — secure_url завантаженого зображення
 */
export async function uploadToCloudinary(
  file: File,
  folder: string = 'mimir'
): Promise<string> {
  const cloudName    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary env variables not set')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', folder)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!response.ok) {
    throw new Error('Cloudinary upload failed')
  }

  const data = await response.json()
  return data.secure_url as string
}
