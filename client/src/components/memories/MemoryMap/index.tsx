import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Map, Marker, Popup, NavigationControl } from 'react-map-gl/mapbox'
import type { MapRef } from 'react-map-gl/mapbox'
import { LngLatBounds } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useNavigate } from 'react-router-dom'
import type { Plan } from '../../../store/plansStore'
import type { Memory } from '../../../types/memory'
import styles from './MemoryMap.module.css'

/**
 * MemoryMap
 * ---------
 * Карта планів і спогадів (~70% висоти) + скролабельний список знизу.
 * Тап на пін чи рядок списку (план або спогад) → flyTo + popup на карті
 * з обкладинкою (для спогадів). Перехід на `/memories/:id` — тільки тапом
 * по самому попапу.
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

interface MapPin {
  id: string
  lat: number
  lng: number
  color: string
  title: string
  subtitle?: string
  meta: string
  kind: 'plan' | 'memory'
  coverUrl?: string
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
  const mapRef = useRef<MapRef>(null)
  const [mapReady, setMapReady] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [popupPin, setPopupPin] = useState<MapPin | null>(null)
  const [clusters, setClusters] = useState<ClusterGroup[]>([])
  const [tilted, setTilted] = useState(false)

  const handleLoad = () => {
    setMapReady(true)
    mapRef.current?.setLanguage('uk')
  }

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
    }))

  const allPins = [...planPins, ...memoryPins]
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

  // ── Fit bounds / fly to active pin ──────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map || allPins.length === 0) return
    if (allPins.length === 1) {
      map.jumpTo({ center: [allPins[0].lng, allPins[0].lat], zoom: 10 })
      return
    }
    const bounds = allPins.reduce((b, p) => b.extend([p.lng, p.lat]), new LngLatBounds())
    map.fitBounds(bounds, { padding: 40, duration: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, allPins.length])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map || !activePin) return
    map.flyTo({ center: [activePin.lng, activePin.lat], zoom: 12, duration: 1000 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, activePin?.id])

  const handleClusterClick = (group: ClusterGroup) => {
    const map = mapRef.current
    if (!map) return
    map.flyTo({ center: [group.lng, group.lat], zoom: Math.min(map.getZoom() + 3, 18), duration: 600 })
  }

  const handlePinClick = (pin: MapPin) => {
    console.log('[DEBUG] handlePinClick', pin.id, 'activeId was', activeId)
    const next = pin.id === activeId ? null : pin.id
    setActiveId(next)
    setPopupPin(next ? pin : null)
  }

  const handlePopupOpen = (pin: MapPin) => {
    if (pin.kind === 'memory') navigate(`/memories/${pin.id.replace('memory-', '')}`)
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
            initialViewState={{ longitude: 31.1656, latitude: 48.3794, zoom: 5 }}
            mapStyle="mapbox://styles/mapbox/standard"
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

            {popupPin && (
              <Popup
                longitude={popupPin.lng}
                latitude={popupPin.lat}
                anchor="bottom"
                offset={40}
                closeButton
                onClose={() => setPopupPin(null)}
                className={styles.popup}
              >
                <button
                  type="button"
                  className={`${styles.popupContent} ${popupPin.kind === 'memory' ? styles.popupContentClickable : ''}`}
                  onClick={() => handlePopupOpen(popupPin)}
                >
                  {popupPin.coverUrl && (
                    <img src={popupPin.coverUrl} alt="" className={styles.popupCover} />
                  )}
                  <div className={styles.popupBody}>
                    <span className={styles.popupStatus}>{popupPin.meta}</span>
                    <span className={styles.popupTitle}>{popupPin.title}</span>
                    {popupPin.subtitle && (
                      <span className={styles.popupAddr}>{popupPin.subtitle}</span>
                    )}
                  </div>
                </button>
              </Popup>
            )}
          </Map>
        </div>
      </div>

      {/* ── Pin list ── */}
      <div className={styles.list}>
        {allPins.map(pin => {
          const active = pin.id === activeId
          return (
            <button
              key={pin.id}
              type="button"
              className={`${styles.planRow} ${active ? styles.planRowActive : ''}`}
              onClick={() => handlePinClick(pin)}
            >
              <span
                className={styles.dot}
                style={{ background: pin.color }}
              />
              <span className={styles.planInfo}>
                <span className={styles.planTitle}>{pin.title}</span>
                {pin.subtitle && (
                  <span className={styles.planAddr}>{pin.subtitle}</span>
                )}
              </span>
              <span className={styles.planStatus}>{pin.meta}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default MemoryMap
