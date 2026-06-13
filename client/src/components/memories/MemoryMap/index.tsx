import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Plan } from '../../../store/plansStore'
import styles from './MemoryMap.module.css'

/**
 * MemoryMap
 * ---------
 * Leaflet карта з пінами планів (тільки ті що мають lat/lng).
 * Клік по піну → popup з назвою, статусом і посиланням.
 *
 * Props:
 * @prop {Plan[]} plans — всі плани (фільтруємо ті що мають координати)
 */
interface MemoryMapProps {
  plans: Plan[]
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

function makeIcon(status: string): L.DivIcon {
  const color = STATUS_COLOR[status] ?? '#888'
  const svg = `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.27 0 0 6.27 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.27 21.73 0 14 0Z" fill="${color}"/>
    <circle cx="14" cy="14" r="6" fill="white" fill-opacity="0.9"/>
  </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  })
}

// Auto-fit bounds when plans change
const FitBounds: React.FC<{ plans: Plan[] }> = ({ plans }) => {
  const map = useMap()
  useEffect(() => {
    const pts = plans.filter(p => p.location.lat && p.location.lng)
    if (pts.length === 0) return
    if (pts.length === 1) {
      map.setView([pts[0].location.lat!, pts[0].location.lng!], 10)
      return
    }
    const bounds = L.latLngBounds(pts.map(p => [p.location.lat!, p.location.lng!]))
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [plans.length])
  return null
}

const MemoryMap: React.FC<MemoryMapProps> = ({ plans }) => {
  const withCoords = plans.filter(p => p.location.lat !== null && p.location.lng !== null)

  return (
    <div className={styles.root}>
      {withCoords.length === 0 ? (
        <div className={styles.empty}>
          <p>Немає планів з локацією</p>
          <span>Додай адресу при створенні плану</span>
        </div>
      ) : (
        <MapContainer
          center={[48.3794, 31.1656]}
          zoom={5}
          className={styles.map}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OSM</a>'
          />
          <FitBounds plans={withCoords} />
          {withCoords.map(plan => (
            <Marker
              key={plan._id}
              position={[plan.location.lat!, plan.location.lng!]}
              icon={makeIcon(plan.status)}
            >
              <Popup className={styles.popup}>
                <div className={styles.popupContent}>
                  <span className={styles.popupStatus}>{STATUS_LABEL[plan.status]}</span>
                  <span className={styles.popupTitle}>{plan.title}</span>
                  {plan.location.name && (
                    <span className={styles.popupAddr}>{plan.location.name}</span>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  )
}

export default MemoryMap
