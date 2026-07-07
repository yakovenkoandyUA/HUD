import { useState, useRef } from 'react'
import React from 'react'
import { uploadToCloudinary } from '@/shared/utils/uploadToCloudinary'

/**
 * useImageUpload
 * --------------
 * Хук для завантаження зображення через прихований file input.
 * Повертає стан і функцію-тригер для відкриття вибору файлу.
 *
 * @param {string} folder                   — папка в Cloudinary
 * @param {(url: string) => void} onSuccess — коллбек з URL після завантаження
 */
export function useImageUpload(
  folder: string,
  onSuccess: (url: string) => void
) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const inputRef                  = useRef<HTMLInputElement>(null)

  const trigger = () => inputRef.current?.click()

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Тільки зображення')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Максимум 10MB')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const url = await uploadToCloudinary(file, folder)
      onSuccess(url)
    } catch {
      setError('Помилка завантаження')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const inputElement = React.createElement('input', {
    ref: inputRef,
    type: 'file',
    accept: 'image/*',
    style: { display: 'none' },
    onChange: handleChange,
  })

  return { trigger, uploading, error, inputElement }
}
