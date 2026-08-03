const MAX_PX = 1600
const JPEG_QUALITY = 0.82

/**
 * isHeic
 * ------
 * HEIC/HEIF (iPhone camera default format) — not renderable via <img>/<canvas>
 * on Android/Chrome/Firefox, only Safari can decode it. MIME type detection is
 * unreliable for it (some pickers report '', 'application/octet-stream', or the
 * correct 'image/heic'), so extension is checked as a fallback.
 */
export function isHeic(file: File): boolean {
  const type = file.type.toLowerCase()
  return type === 'image/heic' || type === 'image/heif' || /\.hei[cf]$/i.test(file.name)
}

async function compressImage(file: File): Promise<File> {
  const heic = isHeic(file)
  if (!heic && (!file.type.startsWith('image/') || file.type === 'image/gif')) return file

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
          // For HEIC, always take the JPEG re-encode even if it's larger than the
          // source — HEIC is a more efficient codec, so a bigger JPEG isn't a sign
          // compression "failed", and uploading raw HEIC would render as a broken
          // image for anyone viewing it outside Safari.
          if (!blob || (!heic && blob.size >= file.size)) { resolve(file); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        JPEG_QUALITY,
      )
    }
    // Decode failed — happens for HEIC on non-Safari browsers, which can't decode
    // it at all. Nothing more to do client-side without a WASM HEIC decoder; the
    // raw file goes through as-is (same as today).
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
