import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFamilyStore, type FamilyMember } from '@/shared/store/familyStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useAchievementsStore } from '@/shared/store/achievementsStore'
import KynGraph from './components/KynGraph'
import styles from './ProfilePage.module.css'
import mfStyles from './MeFamily.module.css'

/**
 * MeFamily
 * --------
 * Повна сторінка "Близькі": хедер з кнопкою пошуку, граф зв'язків,
 * запити та пошук нових учасників. Пошуковий інпут анімовано відкривається
 * під хедером при натисканні іконки лупи.
 */

const RELATION_TYPES: { value: string; label: string }[] = [
  { value: 'partner',  label: 'Дівчина/Хлопець' },
  { value: 'friend',   label: 'Друг'             },
  { value: 'family',   label: "Сім'я"            },
  { value: 'colleague', label: 'Колега'          },
]

const MeFamily: React.FC = () => {
  const navigate  = useNavigate()
  const { showToast } = useUiStore()
  const { activeProfile } = useProfileStore()
  const { accepted, pendingSent, pendingReceived, searchResults, searchUsers, sendRequest, acceptRequest, removeLink, clearSearch, fetchFamily } = useFamilyStore()

  useEffect(() => { fetchFamily() }, [fetchFamily])

  const [familySearch, setFamilySearch]   = useState('')
  const [familyLoading, setFamilyLoading] = useState(false)
  const [pendingUser, setPendingUser]     = useState<FamilyMember | null>(null)
  const [searchOpen, setSearchOpen]       = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const toggleSearch = () => {
    setSearchOpen(v => {
      const next = !v
      if (!next) { setFamilySearch(''); clearSearch(); setPendingUser(null) }
      return next
    })
  }

  useEffect(() => {
    if (searchOpen) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 260)
      return () => clearTimeout(t)
    }
  }, [searchOpen])

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
      setSearchOpen(false)
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
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12.5 16L7 10l5.5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className={styles.headerTitle}>БЛИЗЬКІ</span>
        <button
          type="button"
          className={`${mfStyles.searchToggleBtn} ${searchOpen ? mfStyles.searchToggleBtnActive : ''}`}
          onClick={toggleSearch}
          aria-label={searchOpen ? 'Закрити пошук' : 'Пошук'}
        >
          {searchOpen ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.7"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      </div>

      {/* ── Animated search bar ── */}
      <div className={`${mfStyles.searchBar} ${searchOpen ? mfStyles.searchBarOpen : ''}`}>
        <div className={mfStyles.searchInputWrap}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={mfStyles.searchInputIcon} aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <input
            ref={searchInputRef}
            className={mfStyles.searchInput}
            type="text"
            placeholder="Пошук по логіну..."
            value={familySearch}
            onChange={e => handleFamilySearch(e.target.value)}
          />
          {familySearch && (
            <button
              type="button"
              className={mfStyles.searchClearBtn}
              onClick={() => { setFamilySearch(''); clearSearch(); setPendingUser(null) }}
              aria-label="Очистити"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Search results */}
        {searchOpen && !pendingUser && familySearch && searchResults.length > 0 && (
          <div className={mfStyles.searchResults}>
            {searchResults.map(u => (
              <button
                key={u.id}
                type="button"
                className={mfStyles.searchResultItem}
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
                  <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </span>
              </button>
            ))}
          </div>
        )}

        {searchOpen && !pendingUser && familySearch && searchResults.length === 0 && familySearch.length >= 2 && (
          <p className={mfStyles.searchNoResults}>Нікого не знайдено</p>
        )}

        {/* Relationship type picker */}
        {searchOpen && pendingUser && (
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
                <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
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

      {/* ── Scrollable content ── */}
      <div className={styles.content}>
        {/* Pending incoming requests */}
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

        {/* Graph */}
        {activeProfile && (
          <KynGraph
            me={{ name: activeProfile.name, avatarUrl: activeProfile.avatarUrl ?? null }}
            members={accepted}
            onRemove={handleFamilyRemove}
          />
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
                <button type="button" className={styles.familyRemoveBtn} onClick={() => handleFamilyRemove(l.linkId)}>
                  <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MeFamily
