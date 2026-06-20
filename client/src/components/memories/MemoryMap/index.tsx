import React, { useCallback, useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import type { Plan } from '../../../store/plansStore'
import type { Memory } from '../../../types/memory'
import styles from './MemoryMap.module.css'

/**
 * MemoryMap
 * ---------
 * Карта планів і спогадів (~70% висоти) + скролабельний список знизу.
 * Тап на план → flyTo + popup (стається на карті).
 * Тап на спогад → перехід на `/memories/:id`.
 *
 * Props:
 * @prop {Plan[]}    plans     — всі плани (фільтруємо ті що мають lat/lng)
 * @prop {Memory[]}  memories  — всі спогади (фільтруємо ті що мають lat/lng)
 */
interface MemoryMapProps {
  plans: Plan[]
  memories: Memory[]
}

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
}

function makeIcon(color: string, active: boolean): L.DivIcon {
  const scale = active ? 1.35 : 1
  const w = Math.round(28 * scale)
  const h = Math.round(36 * scale)
  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.27 0 0 6.27 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.27 21.73 0 14 0Z" fill="${color}"/>
    <circle cx="14" cy="14" r="6" fill="white" fill-opacity="0.9"/>
  </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:    [w, h],
    iconAnchor:  [w / 2, h],
    popupAnchor: [0, -h],
  })
}

function makeClusterIcon(count: number): L.DivIcon {
  const size = 32 + Math.min(count, 9) * 2
  const svg = `<div style="width:${size}px;height:${size}px;border-radius:50%;
    background:var(--accent);border:2px solid #fff;display:flex;align-items:center;
    justify-content:center;color:#fff;font-family:var(--font-ui);font-weight:700;
    font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.35);">${count}</div>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// ── Pixel-distance clustering (no external lib) ──────────────────────────────

interface ClusterGroup {
  pins: MapPin[]
  center: [number, number]
}

const CLUSTER_THRESHOLD_PX = 44

/**
 * ClusteredMarkers
 * -----------------
 * Групує пін-маркери, що візуально перекриваються на поточному зумі
 * (відстань у пікселях, не в градусах — тож кластери розпадаються при зумі).
 * Клік на кластер — flyTo до центру з більшим зумом, клік на одиничний пін —
 * делегується в onMarkerClick (різна поведінка для плану/спогаду).
 */
const ClusteredMarkers: React.FC<{
  pins: MapPin[]
  activeId: string | null
  onMarkerClick: (pin: MapPin) => void
}> = ({ pins, activeId, onMarkerClick }) => {
  const map = useMap()
  const [clusters, setClusters] = useState<ClusterGroup[]>([])

  const recompute = useCallback(() => {
    const points = pins.map(p => ({ pin: p, pt: map.latLngToContainerPoint([p.lat, p.lng]) }))
    const used = new Array(points.length).fill(false)
    const groups: ClusterGroup[] = []

    for (let i = 0; i < points.length; i++) {
      if (used[i]) continue
      const members = [points[i]]
      used[i] = true
      for (let j = i + 1; j < points.length; j++) {
        if (used[j]) continue
        if (points[i].pt.distanceTo(points[j].pt) < CLUSTER_THRESHOLD_PX) {
          members.push(points[j])
          used[j] = true
        }
      }
      const lat = members.reduce((s, m) => s + m.pin.lat, 0) / members.length
      const lng = members.reduce((s, m) => s + m.pin.lng, 0) / members.length
      groups.push({ pins: members.map(m => m.pin), center: [lat, lng] })
    }
    setClusters(groups)
  }, [map, pins])

  useEffect(() => { recompute() }, [recompute])
  useMapEvents({ zoomend: recompute, moveend: recompute })

  const handleClusterClick = (group: ClusterGroup) => {
    map.flyTo(group.center, Math.min(map.getZoom() + 3, 18), { duration: 0.6 })
  }

  return (
    <>
      {clusters.map((group, idx) => {
        if (group.pins.length === 1) {
          const pin = group.pins[0]
          const active = pin.id === activeId
          return (
            <Marker
              key={pin.id}
              position={[pin.lat, pin.lng]}
              icon={makeIcon(pin.color, active)}
              eventHandlers={{ click: () => onMarkerClick(pin) }}
            >
              <Popup className={styles.popup}>
                <div className={styles.popupContent}>
                  <span className={styles.popupStatus}>{pin.meta}</span>
                  <span className={styles.popupTitle}>{pin.title}</span>
                  {pin.subtitle && (
                    <span className={styles.popupAddr}>{pin.subtitle}</span>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        }
        return (
          <Marker
            key={`cluster-${idx}`}
            position={group.center}
            icon={makeClusterIcon(group.pins.length)}
            eventHandlers={{ click: () => handleClusterClick(group) }}
          />
        )
      })}
    </>
  )
}

// ── Map controllers ───────────────────────────────────────────────────────────

const FitBounds: React.FC<{ pins: MapPin[] }> = ({ pins }) => {
  const map = useMap()
  useEffect(() => {
    if (pins.length === 0) return
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 10)
      return
    }
    const bounds = L.latLngBounds(pins.map(p => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [pins.length]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

const FlyTo: React.FC<{ pin: MapPin | null }> = ({ pin }) => {
  const map = useMap()
  useEffect(() => {
    if (!pin) return
    map.flyTo([pin.lat, pin.lng], 12, { duration: 1 })
  }, [pin?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

// ── Main component ────────────────────────────────────────────────────────────

const MemoryMap: React.FC<MemoryMapProps> = ({ plans, memories }) => {
  const navigate = useNavigate()
  const [activeId, setActiveId] = useState<string | null>(null)

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
    }))

  const allPins = [...planPins, ...memoryPins]
  const activePin = allPins.find(p => p.id === activeId) ?? null

  const handlePinClick = (pin: MapPin) => {
    if (pin.kind === 'memory') {
      navigate(`/memories/${pin.id.replace('memory-', '')}`)
      return
    }
    setActiveId(pin.id === activeId ? null : pin.id)
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
        <MapContainer
          center={[48.3794, 31.1656]}
          zoom={5}
          className={styles.map}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OSM</a> &copy; <a href="https://carto.com">CARTO</a>'
          />
          <FitBounds pins={allPins} />
          <FlyTo pin={activePin} />
          <ClusteredMarkers
            pins={allPins}
            activeId={activeId}
            onMarkerClick={handlePinClick}
          />
        </MapContainer>
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
