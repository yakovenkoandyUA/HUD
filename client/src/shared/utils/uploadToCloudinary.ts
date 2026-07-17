const MAX_PX = 1600
const JPEG_QUALITY = 0.82

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { naturalWidth: w, naturalHeight: h } = img
      const scale = Math.min(1, MAX_PX / Math.max(w, h))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(w * scale)
      canvas.height = Math.round(h * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) { resolve(file); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        JPEG_QUALITY,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

async function _upload(file: File, folder: string): Promise<{ secure_url: string; public_id: string }> {
  const cloudName    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) throw new Error('Cloudinary env variables not set')

  const compressed = await compressImage(file)

  const formData = new FormData()
  formData.append('file', compressed)
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
 * Стискає зображення до MAX_PX/JPEG_QUALITY перед завантаженням, повертає secure_url.
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
