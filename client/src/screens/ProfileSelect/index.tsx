import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../../store/profileStore'
import { isPushSubscribed, subscribeToPush } from '../../utils/pushManager'
import styles from './ProfileSelect.module.css'

/**
 * ProfileSelectScreen
 * -------------------
 * Fullscreen екран вибору профілю (Netflix-style).
 * Публічний роут — доступний без токена.
 * Список профілів завантажується з /api/auth/profiles.
 * Тап на картку → selectProfile() → navigate('/').
 */
const ProfileSelectScreen: React.FC = () => {
  const navigate = useNavigate()
  const { profiles, fetchProfiles, selectProfile } = useProfileStore()

  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  const handleSelect = async (username: string) => {
    try {
      await selectProfile(username)
      navigate('/')
      isPushSubscribed().then((subscribed) => {
        if (!subscribed) subscribeToPush()
      })
    } catch {
      /* toast error could go here */
    }
  }

  return (
    <div className={styles.root}>
      <h1 className={styles.logo}>MIMIR</h1>
      <p className={styles.subtitle}>ХТО ДИВИТЬСЯ?</p>

      <div className={styles.grid}>
        {profiles.map(profile => (
          <button
            key={profile.username}
            type="button"
            className={styles.card}
            onClick={() => handleSelect(profile.username)}
          >
            <div className={styles.avatar}>
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className={styles.avatarImg}
                />
              ) : (
                <span className={styles.avatarInitial}>
                  {profile.name[0].toUpperCase()}
                </span>
              )}
            </div>
            <span className={styles.name}>{profile.name}</span>
          </button>
        ))}

        {profiles.length === 0 && (
          <p className={styles.loading}>Завантаження...</p>
        )}
      </div>

      <button type="button" className={styles.addBtn} disabled>
        + Додати профіль
      </button>
    </div>
  )
}

export default ProfileSelectScreen
