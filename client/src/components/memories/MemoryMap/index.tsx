import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Map, Marker, Popup, Source, Layer, NavigationControl } from 'react-map-gl/mapbox'
import type { MapRef } from 'react-map-gl/mapbox'
import { LngLatBounds } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useNavigate } from 'react-router-dom'
import type { Plan } from '../../../store/plansStore'
import type { Memory } from '../../../types/memory'
import { useUiStore } from '../../../store/uiStore'
import { getLightPresetForTheme } from '../../../utils/mapboxTheme'
import { fetchRoute, type RouteResult } from '../../../utils/mapboxDirections'
import styles from './MemoryMap.module.css'

/**
 * MemoryMap
 * ---------
 * Карта планів, спогадів і закладів (~70% висоти) + горизонтальна карусель
 * карток знизу. Тап на пін чи картку → flyTo + popup на карті з обкладинкою
 * (для спогадів). Перехід на `/memories/:id` — тільки тапом по самому попапу.
 *
 * Props:
 * @prop {Plan[]}    plans     — всі плани (фільтруємо ті що мають lat/lng)
 * @prop {Memory[]}  memories  — всі спогади (фільтруємо ті що мають lat/lng)
 */
interface MemoryMapProps {
  plans: Plan[]
  memories: Memory[]
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string

const STATUS_COLOR: Record<string, string> = {
  want:    '#888',
  planned: 'var(--accent)',
  visited: 'var(--second)',
}

const STATUS_LABEL: Record<string, string> = {
  want:    'Хочу відвідати',
  planned: 'Заплановано',
  visited: 'Відвідано',
}

const MEMORY_COLOR = 'var(--gold)'
const PLACE_COLOR = 'var(--second)'

interface MapPin {
  id: string
  lat: number
  lng: number
  color: string
  title: string
  subtitle?: string
  meta: string
  kind: 'plan' | 'memory' | 'place'
  coverUrl?: string
  places?: MapPin[]
}

const KIND_ICON: Record<MapPin['kind'], React.ReactNode> = {
  plan: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 17V3M5 3l9 3-9 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  memory: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="7" cy="8" r="1.3" fill="currentColor"/>
      <path d="M3 14l4-4 3 3 3-4 4 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  place: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2a5.5 5.5 0 0 1 5.5 5.5c0 4.2-5.5 10.5-5.5 10.5S4.5 11.7 4.5 7.5A5.5 5.5 0 0 1 10 2Z" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="10" cy="7.5" r="2" fill="currentColor"/>
    </svg>
  ),
}

const PinMarker: React.FC<{ color: string; active: boolean }> = ({ color, active }) => {
  const scale = active ? 1.35 : 1
  const w = Math.round(28 * scale)
  const h = Math.round(36 * scale)
  return (
    <svg width={w} height={h} viewBox="0 0 28 36" fill="none">
      <path d="M14 0C6.27 0 0 6.27 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.27 21.73 0 14 0Z" fill={color}/>
      <circle cx="14" cy="14" r="6" fill="white" fillOpacity="0.9"/>
    </svg>
  )
}

const MAP_HINT_KEY = 'hud-map-hint-dismissed'

/**
 * MapFeatureHint
 * --------------
 * Одноразова підказка про неочевидні можливості карти (обертання двома
 * пальцями, 3D-нахил, маршрут із попапу). Закривається тапом, стан у
 * localStorage — більше не показується.
 */
const MapFeatureHint: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => (
  <div className={styles.featureHint}>
    <button type="button" className={styles.featureHintClose} onClick={onDismiss} aria-label="Закрити підказку">✕</button>
    <div className={styles.featureHintRow}>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 8a6 6 0 1 1 1.8 4.3M2 8v4M2 8h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Крути карту двома пальцями
    </div>
    <div className={styles.featureHintRow}>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 11l5-7 3 4 4-6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 13h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
      Кнопка «3D» — нахил під кутом
    </div>
    <div className={styles.featureHintRow}>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 1a4 4 0 0 1 4 4c0 3-4 7-4 7S4 8 4 5a4 4 0 0 1 4-4Z" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M11 13l3 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="1.4 1.4"/>
      </svg>
      Тапни пін → фото і маршрут
    </div>
  </div>
)

const ClusterBubble: React.FC<{ count: number }> = ({ count }) => {
  const size = 32 + Math.min(count, 9) * 2
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--accent)', border: '2px solid #fff', display: 'flex',
      alignItems: 'center', justifyContent: 'center', color: '#fff',
      fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13,
      boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
    }}>
      {count}
    </div>
  )
}

// ── Pixel-distance clustering (no external lib) ──────────────────────────────

interface ClusterGroup {
  pins: MapPin[]
  lat: number
  lng: number
}

const CLUSTER_THRESHOLD_PX = 44

const MemoryMap: React.FC<MemoryMapProps> = ({ plans, memories }) => {
  const navigate = useNavigate()
  const theme = useUiStore(s => s.theme)
  const mapRef = useRef<MapRef>(null)
  const [mapReady, setMapReady] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [popupPin, setPopupPin] = useState<MapPin | null>(null)
  const [clusters, setClusters] = useState<ClusterGroup[]>([])
  const [tilted, setTilted] = useState(false)
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    if (!localStorage.getItem(MAP_HINT_KEY)) setShowHint(true)
  }, [])

  const dismissHint = () => {
    localStorage.setItem(MAP_HINT_KEY, '1')
    setShowHint(false)
  }

  const handleLoad = () => {
    setMapReady(true)
    mapRef.current?.setLanguage('uk')
    mapRef.current?.setConfigProperty('basemap', 'lightPreset', getLightPresetForTheme(theme))
  }

  // Перемкнути lightPreset, якщо юзер змінив тему застосунку поки карта відкрита
  useEffect(() => {
    if (!mapReady) return
    mapRef.current?.setConfigProperty('basemap', 'lightPreset', getLightPresetForTheme(theme))
  }, [theme, mapReady])

  const togglePitch = () => {
    const map = mapRef.current
    if (!map) return
    const next = !tilted
    setTilted(next)
    map.easeTo({ pitch: next ? 60 : 0, duration: 500 })
  }

  const planPins: MapPin[] = plans
    .filter(p => p.location.lat !== null && p.location.lng !== null)
    .map(p => ({
      id:       `plan-${p._id}`,
      lat:      p.location.lat!,
      lng:      p.location.lng!,
      color:    STATUS_COLOR[p.status] ?? '#888',
      title:    p.title,
      subtitle: p.location.name ?? undefined,
      meta:     STATUS_LABEL[p.status],
      kind:     'plan' as const,
    }))

  const memoryPins: MapPin[] = memories
    .filter(m => m.lat != null && m.lng != null)
    .map(m => ({
      id:       `memory-${m.id}`,
      lat:      m.lat!,
      lng:      m.lng!,
      color:    MEMORY_COLOR,
      title:    m.title,
      subtitle: m.location,
      meta:     'Спогад',
      kind:     'memory' as const,
      coverUrl: m.coverUrl || m.photos[0]?.url,
      places:   (m.places ?? []).map(place => ({
        id:       `place-${place.id}`,
        lat:      place.lat,
        lng:      place.lng,
        color:    PLACE_COLOR,
        title:    place.name,
        subtitle: place.address,
        meta:     `Заклад · ${m.title}`,
        kind:     'place' as const,
      })),
    }))

  const placePins: MapPin[] = memories.flatMap(m =>
    (m.places ?? []).map(place => ({
      id:       `place-${place.id}`,
      lat:      place.lat,
      lng:      place.lng,
      color:    PLACE_COLOR,
      title:    place.name,
      subtitle: place.address,
      meta:     `Заклад · ${m.title}`,
      kind:     'place' as const,
    }))
  )

  const allPins = [...planPins, ...memoryPins, ...placePins]
  const activePin = allPins.find(p => p.id === activeId) ?? null

  // ── Clustering (pixel distance, recomputed on settle) ──────────────────────

  const recompute = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const points = allPins.map(p => ({ pin: p, pt: map.project([p.lng, p.lat]) }))
    const used = new Array(points.length).fill(false)
    const groups: ClusterGroup[] = []

    for (let i = 0; i < points.length; i++) {
      if (used[i]) continue
      const members = [points[i]]
      used[i] = true
      for (let j = i + 1; j < points.length; j++) {
        if (used[j]) continue
        const dx = points[i].pt.x - points[j].pt.x
        const dy = points[i].pt.y - points[j].pt.y
        if (Math.hypot(dx, dy) < CLUSTER_THRESHOLD_PX) {
          members.push(points[j])
          used[j] = true
        }
      }
      const lat = members.reduce((s, m) => s + m.pin.lat, 0) / members.length
      const lng = members.reduce((s, m) => s + m.pin.lng, 0) / members.length
      groups.push({ pins: members.map(m => m.pin), lat, lng })
    }
    setClusters(groups)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPins.length, mapReady])

  useEffect(() => { if (mapReady) recompute() }, [mapReady, recompute])

  // ── Fly to active pin on click (no auto-fit on load — keep the default globe overview) ──

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map || !activePin) return
    map.flyTo({ center: [activePin.lng, activePin.lat], zoom: 12, duration: 1000 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, activePin?.id])

  useEffect(() => {
    if (!activeId) return
    cardRefs.current[activeId]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeId])

  const handleClusterClick = (group: ClusterGroup) => {
    const map = mapRef.current
    if (!map) return
    map.flyTo({ center: [group.lng, group.lat], zoom: Math.min(map.getZoom() + 3, 18), duration: 600 })
  }

  const handlePinClick = (pin: MapPin) => {
    const next = pin.id === activeId ? null : pin.id
    setActiveId(next)
    setPopupPin(next ? pin : null)
    setRoute(null)
  }

  const closePopup = () => {
    setActiveId(null)
    setPopupPin(null)
    setRoute(null)
  }

  const handlePopupOpen = (pin: MapPin) => {
    if (pin.kind === 'memory') navigate(`/memories/${pin.id.replace('memory-', '')}`)
  }

  const handleRoute = (pin: MapPin) => {
    if (!navigator.geolocation) return
    setRouteLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const from = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        const result = await fetchRoute(from, { lat: pin.lat, lng: pin.lng }).catch(() => null)
        setRouteLoading(false)
        if (!result) return
        setRoute(result)
        const bounds = result.geojson.geometry.coordinates.reduce(
          (b, c) => b.extend(c as [number, number]), new LngLatBounds()
        )
        mapRef.current?.fitBounds(bounds, { padding: 60 })
      },
      () => setRouteLoading(false),
      { timeout: 8000 }
    )
  }

  if (allPins.length === 0) {
    return (
      <div className={styles.root}>
        <div className={styles.empty}>
          <p>Немає планів чи спогадів з локацією</p>
          <span>Додай місце при створенні</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      {/* ── Map ── */}
      <div className={styles.mapWrap}>
        {showHint && <MapFeatureHint onDismiss={dismissHint} />}
        <button
          type="button"
          className={`${styles.pitchBtn} ${tilted ? styles.pitchBtnActive : ''}`}
          onClick={togglePitch}
          aria-label="Перемкнути 3D-нахил"
        >
          3D
        </button>
        <div className={styles.map}>
          <Map
            ref={mapRef}
            mapboxAccessToken={MAPBOX_TOKEN}
            initialViewState={{ longitude: 31.1656, latitude: 48.3794, zoom: 2 }}
            mapStyle="mapbox://styles/mapbox/standard"
            projection={{ name: 'globe' }}
            style={{ width: '100%', height: '100%' }}
            onLoad={handleLoad}
            onZoomEnd={recompute}
            onMoveEnd={recompute}
          >
            <NavigationControl position="top-right" showCompass={false} />
            {clusters.map((group, idx) => {
              if (group.pins.length === 1) {
                const pin = group.pins[0]
                const active = pin.id === activeId
                return (
                  <Marker key={pin.id} longitude={pin.lng} latitude={pin.lat} anchor="bottom" onClick={() => handlePinClick(pin)}>
                    <PinMarker color={pin.color} active={active} />
                  </Marker>
                )
              }
              return (
                <Marker key={`cluster-${idx}`} longitude={group.lng} latitude={group.lat} anchor="center" onClick={() => handleClusterClick(group)}>
                  <ClusterBubble count={group.pins.length} />
                </Marker>
              )
            })}

            {route && (
              <Source id="route" type="geojson" data={route.geojson}>
                <Layer
                  id="route-line"
                  type="line"
                  paint={{ 'line-color': '#3b82f6', 'line-width': 4, 'line-opacity': 0.8 }}
                  layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                />
              </Source>
            )}

            {popupPin && (
              <Popup
                longitude={popupPin.lng}
                latitude={popupPin.lat}
                anchor="bottom"
                offset={40}
                closeButton
                closeOnClick={false}
                onClose={closePopup}
                className={styles.popup}
              >
                <div className={styles.popupWrap}>
                  <button
                    type="button"
                    className={`${styles.popupContent} ${popupPin.kind === 'memory' ? styles.popupContentClickable : ''}`}
                    onClick={() => handlePopupOpen(popupPin)}
                  >
                    {popupPin.coverUrl && (
                      <div className={styles.popupPolaroid}>
                        <img src={popupPin.coverUrl} alt="" className={styles.popupCover} />
                      </div>
                    )}
                    <div className={styles.popupBody}>
                      <span className={styles.popupStatus}>{popupPin.meta}</span>
                      <span className={styles.popupTitle}>{popupPin.title}</span>
                      {popupPin.subtitle && (
                        <span className={styles.popupAddr}>{popupPin.subtitle}</span>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    className={styles.popupRouteBtn}
                    onClick={() => handleRoute(popupPin)}
                    disabled={routeLoading}
                  >
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <circle cx="3" cy="11" r="2" stroke="currentColor" strokeWidth="1.3"/>
                      <circle cx="11" cy="3" r="2" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M5 10.5C8 9 8 7 9 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="1.6 1.6"/>
                    </svg>
                    {routeLoading
                      ? 'Шукаємо маршрут...'
                      : route
                      ? `${route.distanceKm.toFixed(1)} км · ${Math.round(route.durationMin)} хв`
                      : 'Маршрут'}
                  </button>
                </div>
              </Popup>
            )}
          </Map>
        </div>
      </div>

      {/* ── Pin carousel: plans + memories only (places shown as chips inside) ── */}
      <div className={styles.carousel}>
        {[...planPins, ...memoryPins].map(pin => {
          const active = pin.id === activeId
          return (
            <button
              key={pin.id}
              ref={el => { cardRefs.current[pin.id] = el }}
              type="button"
              className={`${styles.pinCard} ${active ? styles.pinCardActive : ''}`}
              onClick={() => handlePinClick(pin)}
            >
              <div className={styles.pinCardMediaWrap}>
                {pin.coverUrl ? (
                  <img src={pin.coverUrl} alt="" className={styles.pinCardCover} />
                ) : (
                  <div
                    className={styles.pinCardIconWrap}
                    style={{ background: `color-mix(in srgb, ${pin.color} 22%, var(--surface2))`, color: pin.color }}
                  >
                    {KIND_ICON[pin.kind]}
                  </div>
                )}
                <span className={styles.pinCardBadge} style={{ borderColor: pin.color, color: pin.color }}>
                  {pin.meta}
                </span>
              </div>
              <div className={styles.pinCardBody}>
                <span className={styles.pinCardTitle}>{pin.title}</span>
                {pin.subtitle && (
                  <span className={styles.pinCardAddr}>{pin.subtitle}</span>
                )}
              </div>
              {pin.places && pin.places.length > 0 && (
                <div className={styles.pinCardPlaces}>
                  {pin.places.map(place => (
                    <button
                      key={place.id}
                      type="button"
                      className={`${styles.pinCardPlaceChip} ${activeId === place.id ? styles.pinCardPlaceChipActive : ''}`}
                      onClick={e => { e.stopPropagation(); handlePinClick(place) }}
                    >
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                        <path d="M5 0.5a3 3 0 013 3c0 2.3-3 6-3 6S2 5.8 2 3.5a3 3 0 013-3z" stroke="currentColor" strokeWidth="1.2"/>
                        <circle cx="5" cy="3.5" r="1" fill="currentColor"/>
                      </svg>
                      {place.title}
                    </button>
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default MemoryMap
