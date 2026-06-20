import React, { useEffect, useRef, useState } from 'react'
import { useProfileStore } from '../../store/profileStore'
import { useUiStore } from '../../store/uiStore'
import { usePushSubscription } from '../../hooks/usePushSubscription'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { clearApiCaches } from '../../utils/appCache'
import styles from './ProfilePage.module.css'

const LocateIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M8 1v2.2M8 12.8V15M1 8h2.2M12.8 8H15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

/**
 * MeSystem
 * --------
 * Підекран "Система" вкладки "Я": місто, F1 модуль, push-сповіщення, кеш, оновлення, install PWA.
 */
const MeSystem: React.FC = () => {
  const { activeProfile, updateProfile } = useProfileStore()
  const { showToast, updateAvailable } = useUiStore()
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushSubscription()
  const { isInstallable, isIOS, promptInstall } = usePwaInstall()
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  const showInstall = !isStandalone && (isInstallable || isIOS)

  const [pushLoading, setPushLoading]           = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [cacheCleared, setCacheCleared] = useState(false)

  const [city, setCity] = useState(activeProfile?.city ?? '')
  const [locatingCity, setLocatingCity] = useState(false)
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      if (!isSupported) return
      if (!cancelled) setPermissionDenied(Notification.permission === 'denied')
    }
    check()
    return () => { cancelled = true }
  }, [isSupported])

  const handlePushToggle = async () => {
    if (pushLoading) return
    setPushLoading(true)
    try {
      if (isSubscribed) {
        await unsubscribe()
      } else {
        const granted = Notification.permission === 'granted'
          ? true
          : await Notification.requestPermission().then(p => p === 'granted')
        if (!granted) { setPermissionDenied(true); return }
        await subscribe()
      }
    } finally {
      setPushLoading(false)
    }
  }

  const handleCityChange = (value: string) => {
    setCity(value)
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current)
    cityDebounceRef.current = setTimeout(() => {
      updateProfile({ city: value.trim() })
    }, 800)
  }

  const handleLocateCity = () => {
    if (!navigator.geolocation) {
      showToast('Геолокація не підтримується', 'error')
      return
    }
    setLocatingCity(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse` +
            `?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=uk`,
            { headers: { 'User-Agent': 'MIMIR-App/1.0' } }
          )
          const data = await r.json()
          const found = data.address?.city || data.address?.town || data.address?.village || data.address?.county
          if (found) {
            setCity(found)
            updateProfile({ city: found })
            showToast(`Місто визначено: ${found}`, 'success')
          } else {
            showToast('Не вдалося визначити місто', 'error')
          }
        } catch {
          showToast('Не вдалося визначити місто', 'error')
        } finally {
          setLocatingCity(false)
        }
      },
      () => {
        showToast('Доступ до геолокації відхилено', 'error')
        setLocatingCity(false)
      },
      { timeout: 8000 }
    )
  }

  if (!activeProfile) return null

  return (
    <div className={styles.settingsCard}>
      <div className={styles.cardRow}>
        <div>
          <div className={styles.cardRowLabel}>Місто (погода)</div>
          <div className={styles.pushSub}>Для блоку "Мій день"</div>
        </div>
        <div className={styles.cityInputRow}>
          <input
            className={styles.fieldInput}
            value={city}
            onChange={e => handleCityChange(e.target.value)}
            placeholder="Київ"
          />
          <button
            type="button"
            className={styles.locateBtn}
            onClick={handleLocateCity}
            disabled={locatingCity}
            aria-label="Визначити місто автоматично"
          >
            {locatingCity ? <span className={styles.locateSpinner} /> : <LocateIcon />}
          </button>
        </div>
      </div>

      <div className={styles.cardDivider} />
      <div className={styles.cardRow}>
        <div className={styles.pushInfo}>
          <span className={styles.cardRowLabel}>F1 модуль</span>
          <span className={styles.pushSub}>Календар, стендінги, прогнози</span>
        </div>
        <button
          type="button"
          className={`${styles.toggle} ${activeProfile.f1Enabled ? styles.toggleOn : ''}`}
          onClick={() => updateProfile({ f1Enabled: !(activeProfile.f1Enabled ?? false) })}
          aria-label="Увімкнути F1 модуль"
          aria-pressed={activeProfile.f1Enabled ?? false}
        >
          <span className={styles.toggleThumb} />
        </button>
      </div>

      {isSupported && !permissionDenied && (
        <>
          <div className={styles.cardDivider} />
          <div className={styles.cardRow}>
            <div className={styles.pushInfo}>
              <span className={styles.cardRowLabel}>Push-сповіщення</span>
              <span className={styles.pushSub}>Гонки, задачі, оновлення</span>
            </div>
            <button
              type="button"
              className={`${styles.toggle} ${isSubscribed ? styles.toggleOn : ''}`}
              onClick={handlePushToggle}
              disabled={pushLoading}
              aria-pressed={isSubscribed}
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>
        </>
      )}
      {isSupported && permissionDenied && (
        <>
          <div className={styles.cardDivider} />
          <div className={styles.cardRow}>
            <span className={styles.pushSub}>Push-сповіщення: дозвіл відхилено — увімкни в налаштуваннях браузера.</span>
          </div>
        </>
      )}

      <div className={styles.cardDivider} />
      <div className={styles.cardRow}>
        <div className={styles.pushInfo}>
          <span className={styles.cardRowLabel}>Очистити кеш</span>
          <span className={styles.pushSub}>API-відповіді, дані сесії</span>
        </div>
        <button
          type="button"
          className={`${styles.pinBtn} ${cacheCleared ? styles.pinBtnDone : ''}`}
          onClick={() => {
            clearApiCaches()
            setCacheCleared(true)
            showToast('Кеш очищено', 'success')
            setTimeout(() => setCacheCleared(false), 2000)
          }}
        >
          {cacheCleared ? '✓ ГОТОВО' : 'ОЧИСТИТИ'}
        </button>
      </div>

      {updateAvailable && (
        <>
          <div className={styles.cardDivider} />
          <div className={styles.cardRow}>
            <span className={styles.cardRowLabel}>Доступне оновлення</span>
            <button type="button" className={styles.pinBtn} onClick={() => window.location.reload()}>
              ОНОВИТИ
            </button>
          </div>
        </>
      )}

      {showInstall && (
        <>
          <div className={styles.cardDivider} />
          <div className={styles.cardRow}>
            {isIOS ? (
              <span className={styles.pushSub}>
                Натисніть <strong>⎙ Share</strong> → <strong>«Додати на початковий екран»</strong>
              </span>
            ) : (
              <>
                <span className={styles.cardRowLabel}>Встановити додаток</span>
                <button type="button" className={styles.pinBtn} onClick={promptInstall}>
                  ВСТАНОВИТИ
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default MeSystem
