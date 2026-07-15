import React, { useCallback, useState } from 'react'
import { useFamilyStore, type FamilyMember } from '@/shared/store/familyStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useAchievementsStore } from '@/shared/store/achievementsStore'
import styles from './ProfilePage.module.css'

/**
 * MeFamily
 * --------
 * Підекран "Близькі" вкладки "Я": запити, учасники, пошук + вибір типу стосунків.
 */

const RELATION_TYPES: { value: string; label: string }[] = [
  { value: 'partner',  label: 'Партнер'  },
  { value: 'friend',   label: 'Друг'     },
  { value: 'family',   label: 'Родина'   },
  { value: 'colleague', label: 'Колега'  },
]

const RELATION_LABELS: Record<string, string> = {
  partner:  'Партнер',
  friend:   'Друг',
  family:   'Родина',
  colleague:'Колега',
}

const MeFamily: React.FC = () => {
  const { showToast } = useUiStore()
  const { accepted, pendingSent, pendingReceived, searchResults, searchUsers, sendRequest, acceptRequest, removeLink, clearSearch } = useFamilyStore()
  const [familySearch, setFamilySearch]   = useState('')
  const [familyLoading, setFamilyLoading] = useState(false)
  const [pendingUser, setPendingUser]     = useState<FamilyMember | null>(null)

  const handleFamilySearch = useCallback((q: string) => {
    setFamilySearch(q)
    setPendingUser(null)
    searchUsers(q)
  }, [searchUsers])

  const handlePickUser = useCallback((u: FamilyMember) => {
    setPendingUser(u)
  }, [])

  const handleSendRequest = useCallback(async (targetUserId: string, relationshipType: string) => {
    setFamilyLoading(true)
    try {
      await sendRequest(targetUserId, relationshipType)
      setFamilySearch(''); clearSearch(); setPendingUser(null)
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
      useAchievementsStore.getState().unlock('family-linked')
      showToast('Підтверджено', 'success')
    } catch {
      showToast('Помилка підтвердження', 'error')
    }
  }, [acceptRequest, showToast])

  const handleFamilyRemove = useCallback(async (linkId: string) => {
    await removeLink(linkId)
    showToast("Зв'язок видалено", 'success')
  }, [removeLink, showToast])

  return (
    <>
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
                <span className={styles.familyUsername}>
                  @{l.username}
                  {l.relationshipType && (
                    <span className={styles.familyRelTag}>{RELATION_LABELS[l.relationshipType] ?? l.relationshipType}</span>
                  )}
                </span>
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
          <span className={styles.pushSub}>Ще немає близьких. Знайди когось нижче.</span>
        </div>
      )}

      <div className={styles.cardDivider} />
      <div className={styles.cardPadded}>
        <div className={styles.familySearchWrap}>
          <input
            className={`${styles.familySearchInput} ${familySearch ? styles.familySearchInputWithClear : ''}`}
            type="text"
            placeholder="Пошук по логіну..."
            value={familySearch}
            onChange={e => handleFamilySearch(e.target.value)}
          />
          {familySearch && (
            <button
              type="button"
              className={styles.familySearchClear}
              onClick={() => { setFamilySearch(''); clearSearch(); setPendingUser(null) }}
              aria-label="Очистити пошук"
            >
              <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          )}

          {/* Search results — pick a user to proceed */}
          {!pendingUser && familySearch && searchResults.length > 0 && (
            <div className={styles.familySearchResults}>
              {searchResults.map(u => (
                <button
                  key={u.id}
                  type="button"
                  className={styles.familySearchItem}
                  onClick={() => handlePickUser(u)}
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

          {!pendingUser && familySearch && searchResults.length === 0 && familySearch.length >= 2 && (
            <p className={styles.familyNoResults}>Нікого не знайдено</p>
          )}

          {/* Relationship type picker */}
          {pendingUser && (
            <div className={styles.relationPicker}>
              <div className={styles.relationPickerUser}>
                <div className={styles.familyAvatar}>
                  {pendingUser.avatarUrl
                    ? <img src={pendingUser.avatarUrl} alt={pendingUser.name} className={styles.familyAvatarImg} />
                    : <span className={styles.familyAvatarInitial}>{pendingUser.name[0]}</span>}
                </div>
                <div className={styles.familyInfo}>
                  <span className={styles.familyName}>{pendingUser.name}</span>
                  <span className={styles.familyUsername}>@{pendingUser.username}</span>
                </div>
                <button type="button" className={styles.familyRemoveBtn} onClick={() => setPendingUser(null)}>
                  <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
              <p className={styles.relationPickerLabel}>Хто ця людина для тебе?</p>
              <div className={styles.relationTypes}>
                {RELATION_TYPES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    className={styles.relationTypeBtn}
                    onClick={() => handleSendRequest(pendingUser.id, r.value)}
                    disabled={familyLoading}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default MeFamily
