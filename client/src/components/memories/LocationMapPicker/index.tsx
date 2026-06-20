import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useModalHistory } from '../../../hooks/useModalHistory'
import Button from '../../ui/Button'
import type { PlanLocation } from '../../../store/plansStore'
import styles from './LocationMapPicker.module.css'

/**
 * LocationMapPicker
 * ------------------
 * Fullscreen bottom sheet — обрати місце тапом на карті (Leaflet),
 * замість пошуку за назвою. Реверс-геокодинг тапнутої точки через LocationIQ.
 * Якщо вже є обране місце (`initialLocation` — обране через пошук) — мітка
 * одразу стоїть там. Інакше центр карти: найкращий збіг з `searchHint`
 * (текст з поля пошуку), якщо він є — інакше геолокація користувача,
 * інакше центр України.
 *
 * Props:
 * @prop {boolean}                       isOpen
 * @prop {() => void}                    onClose
 * @prop {(loc: PlanLocation) => void}   onSelect
 * @prop {string}                        [searchHint]       — поточний текст пошуку для центрування
 * @prop {PlanLocation | null}           [initialLocation]  — вже обране місце (показати мітку)
 */
interface LocationMapPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (loc: PlanLocation) => void
  searchHint?: string
  initialLocation?: PlanLocation | null
}

const LOCATIONIQ_KEY = import.meta.env.VITE_LOCATIONIQ_KEY as string | undefined
const UKRAINE_CENTER: [number, number] = [48.3794, 31.1656]

const pinIcon = L.divIcon({
  html: `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.27 0 0 6.27 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.27 21.73 0 14 0Z" fill="var(--accent)"/>
    <circle cx="14" cy="14" r="6" fill="white" fill-opacity="0.9"/>
  </svg>`,
  className: '',
  iconSize: [28, 36],
  iconAnchor: [14, 36],
})

const ClickHandler: React.FC<{ onPick: (lat: number, lng: number) => void }> = ({ onPick }) => {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  isOpen, onClose, onSelect, searchHint = '', initialLocation = null,
}) => {
  useModalHistory(onClose, isOpen)

  const [center, setCenter] = useState<[number, number] | null>(null)
  const [marker, setMarker] = useState<[number, number] | null>(null)
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [resolvingCenter, setResolvingCenter] = useState(false)

  const locateByGeolocation = () => {
    if (!navigator.geolocation) { setCenter(UKRAINE_CENTER); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
      () => setCenter(UKRAINE_CENTER),
      { timeout: 5000 }
    )
  }

  useEffect(() => {
    if (!isOpen || center) return

    if (initialLocation?.lat != null && initialLocation?.lng != null) {
      const pos: [number, number] = [initialLocation.lat, initialLocation.lng]
      setCenter(pos)
      setMarker(pos)
      setAddress(initialLocation.address || initialLocation.name || '')
      return
    }

    const hint = searchHint.trim()

    if (hint.length >= 3 && LOCATIONIQ_KEY) {
      setResolvingCenter(true)
      const params = new URLSearchParams({
        key: LOCATIONIQ_KEY, q: hint, format: 'json', limit: '1', 'accept-language': 'uk',
      })
      fetch(`https://us1.locationiq.com/v1/search?${params}`)
        .then(r => (r.ok ? r.json() : null))
        .then((data: Array<{ lat: string; lon: string }> | null) => {
          if (data?.[0]) setCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)])
          else locateByGeolocation()
        })
        .catch(() => locateByGeolocation())
        .finally(() => setResolvingCenter(false))
    } else {
      locateByGeolocation()
    }
  }, [isOpen, center]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePick = (lat: number, lng: number) => {
    setMarker([lat, lng])
    setAddress('')
    if (!LOCATIONIQ_KEY) return
    setLoading(true)
    fetch(
      `https://us1.locationiq.com/v1/reverse?key=${LOCATIONIQ_KEY}` +
      `&lat=${lat}&lon=${lng}&format=json&accept-language=uk`
    )
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data?.display_name) setAddress(data.display_name) })
      .catch(() => { /* silent */ })
      .finally(() => setLoading(false))
  }

  const handleConfirm = () => {
    if (!marker) return
    onSelect({
      name:    address.split(',')[0] || 'Обране місце',
      address: address || `${marker[0].toFixed(5)}, ${marker[1].toFixed(5)}`,
      lat:     marker[0],
      lng:     marker[1],
    })
    handleClose()
  }

  const handleClose = () => {
    setMarker(null)
    setAddress('')
    setCenter(null)
    setResolvingCenter(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>

        <div className={styles.header}>
          <span className={styles.headerTitle}>ОБРАТИ НА КАРТІ</span>
          <button type="button" className={styles.closeBtn} onClick={handleClose} aria-label="Закрити">×</button>
        </div>

        <div className={styles.mapWrap}>
          {!center && resolvingCenter && (
            <p className={styles.centeringHint}>Шукаємо «{searchHint.trim()}»...</p>
          )}
          {center && (
            <MapContainer center={center} zoom={13} className={styles.map} zoomControl={false}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://openstreetmap.org">OSM</a> &copy; <a href="https://carto.com">CARTO</a>'
              />
              <ClickHandler onPick={handlePick} />
              {marker && <Marker position={marker} icon={pinIcon} />}
            </MapContainer>
          )}
        </div>

        <div className={styles.footer}>
          <p className={styles.addressLine}>
            {loading ? 'Визначення адреси...' : address || 'Тапни на карту щоб обрати місце'}
          </p>
          <Button fullWidth disabled={!marker} onClick={handleConfirm}>
            ПІДТВЕРДИТИ
          </Button>
        </div>

      </div>
    </div>
  )
}

export default LocationMapPicker
