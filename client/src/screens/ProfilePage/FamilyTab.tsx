import React, { useState, useCallback } from 'react'
import { useFamilyStore } from '../../store/familyStore'
import { useUiStore } from '../../store/uiStore'
import { useCanUseFeature } from '../../hooks/usePlan'
import UpgradePrompt from '../../components/ui/UpgradePrompt'
import styles from './ProfilePage.module.css'

/**
 * FamilyTab
 * ---------
 * Вкладка "Сім'я" — пошук, pending/accepted FamilyLink.
 */
const FamilyTab: React.FC = () => {
  const { accepted, pendingSent, pendingReceived, searchResults, searchUsers, sendRequest, acceptRequest, removeLink, clearSearch } = useFamilyStore()
  const { showToast } = useUiStore()
  const canFamily = useCanUseFeature('familyLink')

  const [familySearch, setFamilySearch]   = useState('')
  const [familyLoading, setFamilyLoading] = useState(false)

  const handleSearch = useCallback((q: string) => {
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

  const handleAccept = useCallback(async (linkId: string) => {
    try {
      await acceptRequest(linkId)
      showToast("Сім'ю підтверджено", 'success')
    } catch {
      showToast('Помилка підтвердження', 'error')
    }
  }, [acceptRequest, showToast])

  const handleRemove = useCallback(async (linkId: string) => {
    await removeLink(linkId)
    showToast("Зв'язок видалено", 'success')
  }, [removeLink, showToast])

  return (
    <div className={styles.tabContent}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>СІМ'Я</span>
          {accepted.length > 0 && <span className={styles.sectionCount}>{accepted.length}</span>}
        </div>

        {/* Pending received */}
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
                  <button type="button" className={styles.familyAcceptBtn} onClick={() => handleAccept(l.linkId)}>Прийняти</button>
                  <button type="button" className={styles.familyRejectBtn} onClick={() => handleRemove(l.linkId)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Accepted members */}
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
                <button type="button" className={styles.familyRemoveBtn} onClick={() => handleRemove(l.linkId)}>
                  <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pending sent */}
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
                <button type="button" className={styles.familyRemoveBtn} onClick={() => handleRemove(l.linkId)}>
                  <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {accepted.length === 0 && pendingReceived.length === 0 && pendingSent.length === 0 && (
          <p className={styles.sectionHint}>Ще немає сімейних зв'язків. Знайди когось нижче.</p>
        )}

        {/* Search — gated by familyLink feature */}
        {canFamily ? (
        <div className={styles.familySearchWrap}>
          <input
            className={styles.familySearchInput}
            type="text"
            placeholder="Пошук по логіну..."
            value={familySearch}
            onChange={e => handleSearch(e.target.value)}
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
        ) : (
          <UpgradePrompt feature="familyLink" message="Сімейні зв'язки доступні з плану Shared Life" />
        )}
      </section>
    </div>
  )
}

export default FamilyTab
