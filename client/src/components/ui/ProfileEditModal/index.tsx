import React, { useEffect, useRef, useState } from 'react'
import Modal from '../Modal'
import { useProfileStore } from '../../../store/profileStore'
import { useUiStore } from '../../../store/uiStore'
import { uploadToCloudinary } from '../../../utils/uploadToCloudinary'
import styles from './ProfileEditModal.module.css'

/**
 * ProfileEditModal
 * ----------------
 * Редагування профілю: аватар (Cloudinary) + відображуване ім'я.
 * Завантаження аватара робиться локально для прев'ю, підвантаження на сервер — при збереженні.
 *
 * Props:
 * @prop {boolean}    isOpen  — чи відкрита модалка
 * @prop {() => void} onClose — закрити модалку
 */
interface ProfileEditModalProps {
  isOpen: boolean
  onClose: () => void
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose }) => {
  const { activeProfile, updateProfile } = useProfileStore()
  const { showToast } = useUiStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const [nameInput, setNameInput]     = useState(activeProfile?.name ?? '')
  const [avatarFile, setAvatarFile]   = useState<File | null>(null)
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)

  // Sync name when modal opens
  useEffect(() => {
    if (isOpen) {
      setNameInput(activeProfile?.name ?? '')
      setAvatarFile(null)
      setPreviewUrl(null)
    }
  }, [isOpen, activeProfile?.name])

  if (!activeProfile) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      const patch: { name?: string; avatarUrl?: string } = {}

      if (avatarFile) {
        patch.avatarUrl = await uploadToCloudinary(avatarFile, 'mimir/avatars')
      }

      const trimmed = nameInput.trim()
      if (trimmed && trimmed !== activeProfile.name) {
        patch.name = trimmed
      }

      if (Object.keys(patch).length === 0) {
        onClose()
        return
      }

      await updateProfile(patch)
      showToast('Профіль оновлено', 'success')
      onClose()
    } catch {
      showToast('Помилка збереження', 'error')
    } finally {
      setSaving(false)
    }
  }

  const displayAvatar = previewUrl ?? activeProfile.avatarUrl

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Профіль">
      <div className={styles.wrap}>

        {/* Avatar */}
        <div className={styles.avatarWrap}>
          <button
            type="button"
            className={styles.avatarBtn}
            onClick={() => fileRef.current?.click()}
            disabled={saving}
            aria-label="Змінити фото"
          >
            {displayAvatar ? (
              <img src={displayAvatar} alt={activeProfile.name} className={styles.avatarImg} />
            ) : (
              <span className={styles.avatarInitial}>
                {activeProfile.name[0].toUpperCase()}
              </span>
            )}
            <span className={styles.avatarOverlay}>
              <PencilIcon />
            </span>
          </button>

          <button
            type="button"
            className={styles.changePhotoBtn}
            onClick={() => fileRef.current?.click()}
            disabled={saving}
          >
            <PencilIcon />
            Змінити фото
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {/* Name */}
        <label className={styles.fieldLabel}>ІМ'Я</label>
        <input
          className={styles.nameInput}
          type="text"
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          maxLength={32}
          disabled={saving}
          autoComplete="off"
        />

        {/* Save */}
        <button
          type="button"
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving || !nameInput.trim()}
        >
          {saving ? '...' : 'ЗБЕРЕГТИ'}
        </button>
      </div>
    </Modal>
  )
}

const PencilIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M9.5 1.5L12.5 4.5L4.5 12.5H1.5V9.5L9.5 1.5Z"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
    />
    <path d="M7.5 3.5L10.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

export default ProfileEditModal
