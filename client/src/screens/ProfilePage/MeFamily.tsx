import React, { useCallback, useState } from 'react'
import { useFamilyStore } from '../../store/familyStore'
import { useUiStore } from '../../store/uiStore'
import styles from './ProfilePage.module.css'

/**
 * MeFamily
 * --------
 * Підекран "Сім'я" вкладки "Я": запити, учасники, пошук.
 */
const MeFamily: React.FC = () => {
  const { showToast } = useUiStore()
  const { accepted, pendingSent, pendingReceived, searchResults, searchUsers, sendRequest, acceptRequest, removeLink, clearSearch } = useFamilyStore()
  const [familySearch, setFamilySearch]   = useState('')
  const [familyLoading, setFamilyLoading] = useState(false)

  const handleFamilySearch = useCallback((q: string) => {
    setFamilySearch(q)
    searchUsers(q)
  }, [searchUsers])

  const handleSendRequest = useCallback(async (targetUserId: string) => {
    setFamilyLoading(true)
    try {
      await sendRequest(targetUserId)
      setFamilySearch(''); clearSearch()
      showToast('Запит надіслано', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Помилка', 'error')
    } finally {
      setFamilyLoading(false)
    }
  }, [sendRequest, clearSearch, showToast])

  const handleFamilyAccept = useCallback(async (linkId: string) => {
    try {
      await acceptRequest(linkId)
      showToast("Сім'ю підтверджено", 'success')
    } catch {
      showToast('Помилка підтвердження', 'error')
    }
  }, [acceptRequest, showToast])

  const handleFamilyRemove = useCallback(async (linkId: string) => {
    await removeLink(linkId)
    showToast("Зв'язок видалено", 'success')
  }, [removeLink, showToast])

  return (
    <div className={styles.settingsCard}>
      {pendingReceived.length > 0 && (
        <div className={styles.familyPending}>
          {pendingReceived.map(l => (
            <div key={l.linkId} className={styles.familyRequest}>
              <div className={styles.familyAvatar}>
                {l.avatarUrl
                  ? <img src={l.avatarUrl} alt={l.name} className={styles.familyAvatarImg} />
                  : <span className={styles.familyAvatarInitial}>{l.name[0]}</span>}
              </div>
              <div className={styles.familyInfo}>
                <span className={styles.familyName}>{l.name}</span>
                <span className={styles.familyUsername}>@{l.username}</span>
              </div>
              <div className={styles.familyRequestBtns}>
                <button type="button" className={styles.familyAcceptBtn} onClick={() => handleFamilyAccept(l.linkId)}>Прийняти</button>
                <button type="button" className={styles.familyRejectBtn} onClick={() => handleFamilyRemove(l.linkId)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {accepted.length > 0 && (
        <div className={styles.familyList}>
          {accepted.map(l => (
            <div key={l.linkId} className={styles.familyMember}>
              <div className={styles.familyAvatar}>
                {l.avatarUrl
                  ? <img src={l.avatarUrl} alt={l.name} className={styles.familyAvatarImg} />
                  : <span className={styles.familyAvatarInitial}>{l.name[0]}</span>}
              </div>
              <div className={styles.familyInfo}>
                <span className={styles.familyName}>{l.name}</span>
                <span className={styles.familyUsername}>@{l.username}</span>
              </div>
              <button type="button" className={styles.familyRemoveBtn} onClick={() => handleFamilyRemove(l.linkId)}>
                <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {pendingSent.length > 0 && (
        <div className={styles.familyPendingSent}>
          {pendingSent.map(l => (
            <div key={l.linkId} className={styles.familyMember}>
              <div className={styles.familyAvatar}>
                {l.avatarUrl
                  ? <img src={l.avatarUrl} alt={l.name} className={styles.familyAvatarImg} />
                  : <span className={styles.familyAvatarInitial}>{l.name[0]}</span>}
              </div>
              <div className={styles.familyInfo}>
                <span className={styles.familyName}>{l.name}</span>
                <span className={styles.familyTag}>Очікує підтвердження</span>
              </div>
              <button type="button" className={styles.familyRemoveBtn} onClick={() => handleFamilyRemove(l.linkId)}>
                <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {accepted.length === 0 && pendingReceived.length === 0 && pendingSent.length === 0 && (
        <div className={styles.cardRow}>
          <span className={styles.pushSub}>Ще немає сімейних зв'язків. Знайди когось нижче.</span>
        </div>
      )}

      <div className={styles.cardDivider} />
      <div className={styles.cardPadded}>
        <div className={styles.familySearchWrap}>
          <input
            className={styles.familySearchInput}
            type="text"
            placeholder="Пошук по логіну..."
            value={familySearch}
            onChange={e => handleFamilySearch(e.target.value)}
          />
          {familySearch && searchResults.length > 0 && (
            <div className={styles.familySearchResults}>
              {searchResults.map(u => (
                <button
                  key={u.id}
                  type="button"
                  className={styles.familySearchItem}
                  onClick={() => handleSendRequest(u.id)}
                  disabled={familyLoading}
                >
                  <div className={styles.familyAvatar}>
                    {u.avatarUrl
                      ? <img src={u.avatarUrl} alt={u.name} className={styles.familyAvatarImg} />
                      : <span className={styles.familyAvatarInitial}>{u.name[0]}</span>}
                  </div>
                  <div className={styles.familyInfo}>
                    <span className={styles.familyName}>{u.name}</span>
                    <span className={styles.familyUsername}>@{u.username}</span>
                  </div>
                  <span className={styles.familyAddIcon}>
                    <svg width="14" height="14" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  </span>
                </button>
              ))}
            </div>
          )}
          {familySearch && searchResults.length === 0 && familySearch.length >= 2 && (
            <p className={styles.familyNoResults}>Нікого не знайдено</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default MeFamily
