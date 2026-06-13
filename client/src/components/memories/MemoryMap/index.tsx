import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Plan } from '../../../store/plansStore'
import styles from './MemoryMap.module.css'

/**
 * MemoryMap
 * ---------
 * Карта планів (~70% висоти) + скролабельний список знизу.
 * Тап на план у списку → flyTo на карті.
 *
 * Props:
 * @prop {Plan[]} plans — всі плани (фільтруємо ті що мають lat/lng)
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

function makeIcon(status: string, active: boolean): L.DivIcon {
  const color = STATUS_COLOR[status] ?? '#888'
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

// ── Map controllers ───────────────────────────────────────────────────────────

const FitBounds: React.FC<{ plans: Plan[] }> = ({ plans }) => {
  const map = useMap()
  useEffect(() => {
    if (plans.length === 0) return
    if (plans.length === 1) {
      map.setView([plans[0].location.lat!, plans[0].location.lng!], 10)
      return
    }
    const bounds = L.latLngBounds(plans.map(p => [p.location.lat!, p.location.lng!]))
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [plans.length]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

const FlyTo: React.FC<{ plan: Plan | null }> = ({ plan }) => {
  const map = useMap()
  useEffect(() => {
    if (!plan) return
    map.flyTo([plan.location.lat!, plan.location.lng!], 12, { duration: 1 })
  }, [plan?._id]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

// ── Main component ────────────────────────────────────────────────────────────

const MemoryMap: React.FC<MemoryMapProps> = ({ plans }) => {
  const withCoords = plans.filter(p => p.location.lat !== null && p.location.lng !== null)
  const [activePlanId, setActivePlanId] = useState<string | null>(null)
  const activePlan = withCoords.find(p => p._id === activePlanId) ?? null

  const handlePlanClick = (plan: Plan) => {
    setActivePlanId(plan._id === activePlanId ? null : plan._id)
  }

  if (withCoords.length === 0) {
    return (
      <div className={styles.root}>
        <div className={styles.empty}>
          <p>Немає планів з локацією</p>
          <span>Додай адресу при створенні плану</span>
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
          <FitBounds plans={withCoords} />
          <FlyTo plan={activePlan} />
          {withCoords.map(plan => {
            const active = plan._id === activePlanId
            return (
              <Marker
                key={plan._id}
                position={[plan.location.lat!, plan.location.lng!]}
                icon={makeIcon(plan.status, active)}
                eventHandlers={{ click: () => setActivePlanId(plan._id) }}
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
            )
          })}
        </MapContainer>
      </div>

      {/* ── Plan list ── */}
      <div className={styles.list}>
        {withCoords.map(plan => {
          const active = plan._id === activePlanId
          return (
            <button
              key={plan._id}
              type="button"
              className={`${styles.planRow} ${active ? styles.planRowActive : ''}`}
              onClick={() => handlePlanClick(plan)}
            >
              <span
                className={styles.dot}
                style={{ background: STATUS_COLOR[plan.status] }}
              />
              <span className={styles.planInfo}>
                <span className={styles.planTitle}>{plan.title}</span>
                {plan.location.name && (
                  <span className={styles.planAddr}>{plan.location.name}</span>
                )}
              </span>
              <span className={styles.planStatus}>{STATUS_LABEL[plan.status]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default MemoryMap
