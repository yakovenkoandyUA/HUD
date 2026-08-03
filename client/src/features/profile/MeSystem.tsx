import React, { useEffect, useRef, useState } from 'react'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { usePushSubscription } from '@/shared/hooks/usePushSubscription'
import { usePwaInstall } from '@/shared/hooks/usePwaInstall'
import { clearApiCaches } from '@/shared/utils/appCache'
import { reverseGeocodeCity } from '@/features/memories/utils/geocode'
import MeSecurity from './MeSecurity'
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
  const { showToast } = useUiStore()
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushSubscription()
  const { isInstallable, isIOS, promptInstall } = usePwaInstall()
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches

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
        const ok = await subscribe()
        if (!ok) {
          showToast(
            isIOS && !isStandalone
              ? 'На iOS сповіщення працюють тільки після встановлення застосунку на головний екран'
              : 'Не вдалося увімкнути сповіщення',
            'error',
          )
        }
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
          const found = await reverseGeocodeCity(pos.coords.latitude, pos.coords.longitude)
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
    <>
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

      {isSupported && !permissionDenied && (
        <>
          <div className={styles.cardDivider} />
          <div className={styles.cardRow}>
            <div className={styles.pushInfo}>
              <span className={styles.cardRowLabel}>Push-сповіщення</span>
              <span className={styles.pushSub}>
                {isIOS && !isStandalone
                  ? 'Спершу встанови застосунок на головний екран'
                  : 'Гонки, задачі, оновлення'}
              </span>
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

      {!isStandalone && (
        <>
          <div className={styles.cardDivider} />
          <div className={styles.cardRow}>
            <div className={styles.pushInfo}>
              <span className={styles.cardRowLabel}>Встановити додаток</span>
              <span className={styles.pushSub}>
                {isIOS
                  ? 'Safari → Share → «Додати на початковий екран»'
                  : isInstallable
                  ? 'Працює офлайн · Без браузера'
                  : 'Chrome → меню ⋮ → «Встановити додаток»'}
              </span>
            </div>
            {isInstallable && (
              <button type="button" className={styles.pinBtn} onClick={promptInstall}>
                ВСТАНОВИТИ
              </button>
            )}
          </div>
        </>
      )}
      <div className={styles.cardDivider} />
      <div className={styles.cardSubTitle} style={{ padding: '12px 16px 4px' }}>БЕЗПЕКА</div>
      <MeSecurity />
    </>
  )
}

export default MeSystem
