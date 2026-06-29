import React, { useEffect, useRef, useState } from 'react'
import { Map, Marker, NavigationControl } from 'react-map-gl/mapbox'
import type { MapMouseEvent, MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useModalHistory } from '../../../hooks/useModalHistory'
import { forwardGeocodeCenter, reverseGeocodeAddress } from '../../../utils/mapboxGeocode'
import { useUiStore } from '../../../store/uiStore'
import { getLightPresetForTheme } from '../../../utils/mapboxTheme'
import Button from '../../ui/Button'
import type { PlanLocation } from '../../../store/plansStore'
import styles from './LocationMapPicker.module.css'

/**
 * LocationMapPicker
 * ------------------
 * Fullscreen bottom sheet — обрати місце тапом на карті (Mapbox GL),
 * замість пошуку за назвою. Реверс-геокодинг тапнутої точки через Mapbox.
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

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string
const UKRAINE_CENTER = { lat: 48.3794, lng: 31.1656 }

const PinMarker: React.FC = () => (
  <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
    <path d="M14 0C6.27 0 0 6.27 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.27 21.73 0 14 0Z" fill="var(--accent)"/>
    <circle cx="14" cy="14" r="6" fill="white" fillOpacity="0.9"/>
  </svg>
)

const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  isOpen, onClose, onSelect, searchHint = '', initialLocation = null,
}) => {
  useModalHistory(onClose, isOpen)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 340)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const theme = useUiStore(s => s.theme)
  const mapRef = useRef<MapRef>(null)
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null)
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [resolvingCenter, setResolvingCenter] = useState(false)
  const [tilted, setTilted] = useState(false)

  const togglePitch = () => {
    const map = mapRef.current
    if (!map) return
    const next = !tilted
    setTilted(next)
    map.easeTo({ pitch: next ? 60 : 0, duration: 500 })
  }

  const locateByGeolocation = () => {
    if (!navigator.geolocation) { setCenter(UKRAINE_CENTER); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCenter(UKRAINE_CENTER),
      { timeout: 5000 }
    )
  }

  useEffect(() => {
    if (!isOpen || center) return

    if (initialLocation?.lat != null && initialLocation?.lng != null) {
      const pos = { lat: initialLocation.lat, lng: initialLocation.lng }
      setCenter(pos)
      setMarker(pos)
      setAddress(initialLocation.address || initialLocation.name || '')
      return
    }

    const hint = searchHint.trim()

    if (hint.length >= 3) {
      setResolvingCenter(true)
      forwardGeocodeCenter(hint)
        .then(pos => { if (pos) setCenter(pos); else locateByGeolocation() })
        .catch(() => locateByGeolocation())
        .finally(() => setResolvingCenter(false))
    } else {
      locateByGeolocation()
    }
  }, [isOpen, center]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePick = (e: MapMouseEvent) => {
    const { lat, lng } = e.lngLat
    setMarker({ lat, lng })
    setAddress('')
    setLoading(true)
    reverseGeocodeAddress(lat, lng)
      .then(found => { if (found) setAddress(found) })
      .catch(() => { /* silent */ })
      .finally(() => setLoading(false))
  }

  const handleConfirm = () => {
    if (!marker) return
    onSelect({
      name:    address.split(',')[0] || 'Обране місце',
      address: address || `${marker.lat.toFixed(5)}, ${marker.lng.toFixed(5)}`,
      lat:     marker.lat,
      lng:     marker.lng,
    })
    handleClose()
  }

  const handleClose = () => {
    setMarker(null)
    setAddress('')
    setCenter(null)
    setResolvingCenter(false)
    setTilted(false)
    onClose()
  }

  if (!mounted) return null

  return (
    <div
      className={`${styles.overlay} ${visible ? styles.overlayVisible : styles.overlayHidden}`}
      onClick={handleClose}
    >
      <div
        className={`${styles.sheet} ${visible ? styles.sheetVisible : styles.sheetHidden}`}
        onClick={e => e.stopPropagation()}
      >

        <div className={styles.header}>
          <span className={styles.headerTitle}>ОБРАТИ НА КАРТІ</span>
          <button type="button" className={styles.closeBtn} onClick={handleClose} aria-label="Закрити">×</button>
        </div>

        <div className={styles.mapWrap}>
          {!center && resolvingCenter && (
            <p className={styles.centeringHint}>Шукаємо «{searchHint.trim()}»...</p>
          )}
          {center && (
            <div className={styles.map}>
              <button
                type="button"
                className={`${styles.pitchBtn} ${tilted ? styles.pitchBtnActive : ''}`}
                onClick={togglePitch}
                aria-label="Перемкнути 3D-нахил"
              >
                3D
              </button>
              <Map
                ref={mapRef}
                mapboxAccessToken={MAPBOX_TOKEN}
                initialViewState={{ longitude: center.lng, latitude: center.lat, zoom: 13 }}
                mapStyle="mapbox://styles/mapbox/standard"
                style={{ width: '100%', height: '100%' }}
                onClick={handlePick}
                onLoad={() => {
                  mapRef.current?.setLanguage('uk')
                  mapRef.current?.setConfigProperty('basemap', 'lightPreset', getLightPresetForTheme(theme))
                }}
              >
                <NavigationControl position="top-right" showCompass={false} />
                {marker && (
                  <Marker longitude={marker.lng} latitude={marker.lat} anchor="bottom">
                    <PinMarker />
                  </Marker>
                )}
              </Map>
            </div>
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
