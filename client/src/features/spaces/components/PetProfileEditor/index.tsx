import React, { useEffect, useId, useRef, useState } from 'react'
import type { PetProfile } from '@/features/memories/store/spacesStore'
import { useUiStore } from '@/shared/store/uiStore'
import CustomDatePicker from '@/shared/components/ui/CustomDatePicker'
import { formatDateUA } from '@/shared/utils/formatDate'
import { uploadToCloudinary } from '@/shared/utils/uploadToCloudinary'
import styles from './PetProfileEditor.module.css'

interface PetProfileEditorProps {
  saving:    boolean
  profile:   PetProfile | null
  spaceName: string
  onSave:    (data: Partial<PetProfile>) => Promise<void>
  color:     string
}

/** Edits a pet's profile and avatar inside the space editor. */
const PetProfileEditor: React.FC<PetProfileEditorProps> = ({ saving, profile, spaceName, onSave, color }) => {
  const showToast = useUiStore(state => state.showToast)
  const fieldId = useId()
  const baseline = useRef({
    name: profile?.name ?? '',
    species: profile?.species ?? '',
    breed: profile?.breed ?? '',
    birthDate: profile?.birthDate ?? null,
    photoUrl: profile?.photoUrl ?? '',
    chipNumber: profile?.chipNumber ?? '',
    passportNumber: profile?.passportNumber ?? '',
  })

  const [name, setName]         = useState(profile?.name ?? '')
  const [species, setSpecies]   = useState(profile?.species ?? '')
  const [breed, setBreed]       = useState(profile?.breed ?? '')
  const [birthDate, setBirthDate]         = useState(profile?.birthDate ?? '')
  const [birthDateOpen, setBirthDateOpen] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl ?? '')
  const [chipNum, setChipNum]   = useState(profile?.chipNumber ?? '')
  const [passport, setPassport] = useState(profile?.passportNumber ?? '')
  const [saveError, setSaveError] = useState('')
  const [photoActionsOpen, setPhotoActionsOpen] = useState(false)
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const documentCount = [chipNum, passport].filter(value => value.trim()).length

  const [pendingImgSrc, setPendingImgSrc] = useState<string | null>(null)
  const [cropOffset, setCropOffset]       = useState({ x: 0, y: 0 })
  const [cropScale, setCropScale]         = useState(1)
  const [cropBusy, setCropBusy]           = useState(false)
  const [naturalSize, setNaturalSize]     = useState({ w: 0, h: 0 })

  const avatarButtonRef = useRef<HTMLButtonElement>(null)
  const fileInputRef   = useRef<HTMLInputElement>(null)
  const cropCircleRef  = useRef<HTMLDivElement>(null)
  const cropImgRef     = useRef<HTMLImageElement>(null)
  const cropOverlayRef = useRef<HTMLDivElement>(null)
  const cropDragRef    = useRef<{ startX: number; startY: number; startOffX: number; startOffY: number } | null>(null)
  const pointersRef    = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchStartRef  = useRef<{ dist: number; scale: number } | null>(null)

  useEffect(() => {
    if (!pendingImgSrc) return
    return () => URL.revokeObjectURL(pendingImgSrc)
  }, [pendingImgSrc])

  useEffect(() => {
    if (!pendingImgSrc || !cropOverlayRef.current) return
    const el = cropOverlayRef.current
    const stop = (e: TouchEvent) => e.stopPropagation()
    el.addEventListener('touchstart', stop, { passive: true })
    el.addEventListener('touchmove',  stop, { passive: false })
    return () => {
      el.removeEventListener('touchstart', stop)
      el.removeEventListener('touchmove',  stop)
    }
  }, [pendingImgSrc])

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoActionsOpen(false)
    setPendingImgSrc(URL.createObjectURL(file))
    setCropOffset({ x: 0, y: 0 }); setCropScale(1)
    e.target.value = ''
  }

  const handleCropImgLoad = () => {
    const img = cropImgRef.current; const circle = cropCircleRef.current
    if (!img || !circle) return
    const size  = circle.offsetWidth
    const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight)
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
    setCropScale(scale)
  }

  const handleCropPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointersRef.current.values()]
    if (pts.length === 1) {
      cropDragRef.current = { startX: e.clientX, startY: e.clientY, startOffX: cropOffset.x, startOffY: cropOffset.y }
      pinchStartRef.current = null
    } else if (pts.length === 2) {
      cropDragRef.current = null
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      pinchStartRef.current = { dist, scale: cropScale }
    }
  }

  const handleCropPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointersRef.current.values()]
    if (pts.length === 2 && pinchStartRef.current) {
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      setCropScale(Math.max(0.3, Math.min(6, pinchStartRef.current.scale * (dist / pinchStartRef.current.dist))))
    } else if (pts.length === 1 && cropDragRef.current) {
      setCropOffset({ x: cropDragRef.current.startOffX + e.clientX - cropDragRef.current.startX, y: cropDragRef.current.startOffY + e.clientY - cropDragRef.current.startY })
    }
  }

  const handleCropPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    pointersRef.current.delete(e.pointerId)
    const pts = [...pointersRef.current.values()]
    if (pts.length === 1) {
      cropDragRef.current = { startX: pts[0].x, startY: pts[0].y, startOffX: cropOffset.x, startOffY: cropOffset.y }
      pinchStartRef.current = null
    } else if (pts.length === 0) {
      cropDragRef.current = null; pinchStartRef.current = null
    }
  }

  const handleCropWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation()
    setCropScale(s => Math.max(0.3, Math.min(6, s * (1 - e.deltaY * 0.001))))
  }

  const handleCropConfirm = async () => {
    if (!cropImgRef.current || !cropCircleRef.current || !pendingImgSrc) return
    setCropBusy(true)
    try {
      const size = 400
      const canvas = document.createElement('canvas')
      canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')!
      ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); ctx.clip()
      const circleSize = cropCircleRef.current.offsetWidth
      const drawW = naturalSize.w * cropScale; const drawH = naturalSize.h * cropScale
      const drawX = (circleSize - drawW) / 2 + cropOffset.x; const drawY = (circleSize - drawH) / 2 + cropOffset.y
      const ratio = size / circleSize
      ctx.drawImage(cropImgRef.current, drawX * ratio, drawY * ratio, drawW * ratio, drawH * ratio)
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', 0.92)
      )
      const file = new File([blob], 'pet-avatar.jpg', { type: 'image/jpeg' })
      const url = await uploadToCloudinary(file, 'spaces')
      setPhotoUrl(url)
      setPendingImgSrc(null)
    } catch {
      showToast('Помилка завантаження — спробуй ще раз', 'error')
    } finally {
      setCropBusy(false)
    }
  }

  const handleCropCancel = () => {
    setPendingImgSrc(null); setCropOffset({ x: 0, y: 0 }); setCropScale(1)
  }

  const handleSave = async () => {
    setSaveError('')
    const draft = {
      name: name.trim(),
      species: species.trim(),
      breed: breed.trim(),
      birthDate: birthDate || null,
      photoUrl,
      chipNumber: chipNum.trim(),
      passportNumber: passport.trim(),
    }
    const changes = Object.fromEntries(
      Object.entries(draft).filter(([key, value]) => baseline.current[key as keyof typeof draft] !== value),
    ) as Partial<PetProfile>
    if (Object.keys(changes).length === 0) return

    try {
      await onSave(changes)
      baseline.current = draft
    } catch {
      setSaveError('Не вдалося зберегти профіль. Спробуй ще раз.')
    }
  }

  return (
    <div className={styles.editor} style={{ '--space-color': color } as React.CSSProperties}>
      {pendingImgSrc ? (
        <>
          <div className={styles.sheetHeader}>
            Кадрування фото
          </div>
          <div ref={cropOverlayRef} className={styles.cropBody}>
            <div
              ref={cropCircleRef}
              className={styles.cropCircle}
              onPointerDown={handleCropPointerDown}
              onPointerMove={handleCropPointerMove}
              onPointerUp={handleCropPointerUp}
              onPointerCancel={handleCropPointerUp}
              onWheel={handleCropWheel}
            >
              <img
                ref={cropImgRef}
                src={pendingImgSrc}
                alt=""
                onLoad={handleCropImgLoad}
                className={styles.cropImg}
                style={{ transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px)) scale(${cropScale})` }}
                draggable={false}
              />
            </div>
            <p className={styles.cropHint}>Перетягни · зводь пальці для масштабу</p>
          </div>
          <div className={styles.cropFooter}>
            <div className={styles.cropFooterBtns}>
              <button type="button" className={styles.cropCancelBtn} onClick={handleCropCancel} disabled={cropBusy}>Скасувати</button>
              <button type="button" className={styles.cropConfirmBtn} onClick={handleCropConfirm} disabled={cropBusy}>
                {cropBusy ? 'Завантаження…' : 'Підтвердити'}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <fieldset className={styles.sheetBody} disabled={saving}>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileSelected} />
            <div className={styles.avatarHero}>
              <button
                ref={avatarButtonRef}
                type="button"
                className={styles.avatarWrap}
                onClick={() => photoUrl ? setPhotoActionsOpen(open => !open) : fileInputRef.current?.click()}
                aria-label={photoUrl ? 'Дії з фото улюбленця' : 'Додати фото улюбленця'}
                aria-expanded={photoUrl ? photoActionsOpen : undefined}
                aria-controls={photoActionsOpen ? fieldId + '-photoActions' : undefined}
              >
                <span className={styles.avatarCircle}>
                  {photoUrl
                    ? <img src={photoUrl} alt="" className={styles.avatarCircleImg} />
                    : <svg className={styles.avatarPlaceholderIcon} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                      </svg>
                  }
                </span>
                <span className={styles.avatarEditBadge} aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </span>
              </button>
              <div className={styles.field}>
                <label htmlFor={fieldId + '-name'} className={styles.fieldLabel}>Кличка</label>
                <input id={fieldId + '-name'} className={styles.fieldInput} value={name} onChange={e => setName(e.target.value)} placeholder={spaceName} />
              </div>
            </div>
            {photoActionsOpen && (
              <div id={fieldId + '-photoActions'} className={styles.photoActions} role="group" aria-label="Дії з фото">
                <button type="button" onClick={() => fileInputRef.current?.click()}>Замінити фото</button>
                <button type="button" className={styles.removePhoto} onClick={() => {
                  setPhotoUrl('')
                  setPhotoActionsOpen(false)
                  avatarButtonRef.current?.focus()
                }}>Видалити фото</button>
              </div>
            )}
            <div className={styles.field}>
              <label htmlFor={fieldId + '-species'} className={styles.fieldLabel}>Вид</label>
              <input id={fieldId + '-species'} className={styles.fieldInput} value={species} onChange={e => setSpecies(e.target.value)} placeholder="Кіт, собака…" />
            </div>
            <div className={styles.field}>
              <label htmlFor={fieldId + '-breed'} className={styles.fieldLabel}>Порода</label>
              <input id={fieldId + '-breed'} className={styles.fieldInput} value={breed} onChange={e => setBreed(e.target.value)} placeholder="—" />
            </div>
            <div className={styles.field}>
              <label htmlFor={fieldId + '-birthDate'} className={styles.fieldLabel}>Дата народження</label>
              <button id={fieldId + '-birthDate'} type="button" className={styles.dateField} onClick={() => setBirthDateOpen(true)}>
                {birthDate ? formatDateUA(birthDate.slice(0, 10)) : 'Не вказано'}
              </button>
              {birthDateOpen && <CustomDatePicker value={birthDate} onChange={v => { setBirthDate(v); setBirthDateOpen(false) }} onClose={() => setBirthDateOpen(false)} />}
            </div>
            <div className={styles.documents}>
              <button
                type="button"
                className={styles.documentsToggle}
                aria-expanded={documentsOpen}
                aria-controls={fieldId + '-documents'}
                onClick={() => setDocumentsOpen(open => !open)}
              >
                Документи
                {documentCount > 0 && <span className={styles.documentsCount}>{documentCount} заповнено</span>}
                <svg className={styles.documentsChevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              <div id={fieldId + '-documents'} className={styles.documentsBody} inert={!documentsOpen}>
                <div className={styles.documentsFields}>
                  <div className={styles.field}>
                    <label htmlFor={fieldId + '-chipNum'} className={styles.fieldLabel}>Номер мікрочіпа</label>
                    <input id={fieldId + '-chipNum'} className={styles.fieldInput} value={chipNum} onChange={e => setChipNum(e.target.value)} placeholder="—" />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor={fieldId + '-passport'} className={styles.fieldLabel}>Номер паспорта</label>
                    <input id={fieldId + '-passport'} className={styles.fieldInput} value={passport} onChange={e => setPassport(e.target.value)} placeholder="—" />
                  </div>
                </div>
              </div>
            </div>
          </fieldset>

          <div className={styles.sheetFooter}>
            {saveError && <p className={styles.saveError} role="alert">{saveError}</p>}
            <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Зберігаємо…' : 'Зберегти профіль'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default PetProfileEditor
