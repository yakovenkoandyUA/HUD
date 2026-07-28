import React, { useState, useCallback } from 'react'
import { useFamilyStore } from '@/shared/store/familyStore'
import type { FamilyMember } from '@/shared/store/familyStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useCanUseFeature } from '@/shared/hooks/usePlan'
import UpgradePrompt from '@/shared/components/ui/UpgradePrompt'
import KynGraph from './components/KynGraph'
import styles from './ProfilePage.module.css'

const REL_TYPES = [
  { value: 'partner',   label: 'Партнер' },
  { value: 'family',    label: 'Рідні' },
  { value: 'friend',    label: 'Друг' },
  { value: 'colleague', label: 'Колега' },
]

/**
 * FamilyTab
 * ---------
 * КИН — граф зв'язків. Пошук, вибір типу відносин, pending/accepted.
 */
const FamilyTab: React.FC = () => {
  const {
    accepted, pendingSent, pendingReceived,
    searchResults, searchUsers, sendRequest, acceptRequest, removeLink, clearSearch,
  } = useFamilyStore()
  const { activeProfile } = useProfileStore()
  const { showToast } = useUiStore()
  const canFamily = useCanUseFeature('familyLink')

  const [familySearch, setFamilySearch]   = useState('')
  const [familyLoading, setFamilyLoading] = useState(false)
  const [pendingUser, setPendingUser]     = useState<FamilyMember | null>(null)

  const handleSearch = useCallback((q: string) => {
    setFamilySearch(q)
    searchUsers(q)
  }, [searchUsers])

  const handlePickUser = useCallback((u: FamilyMember) => {
    setPendingUser(u)
    setFamilySearch('')
    clearSearch()
  }, [clearSearch])

  const handleSendRequest = useCallback(async (type: string) => {
    if (!pendingUser) return
    setFamilyLoading(true)
    try {
      await sendRequest(pendingUser.id, type)
      setPendingUser(null)
      showToast('Запит надіслано', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Помилка', 'error')
    } finally {
      setFamilyLoading(false)
    }
  }, [pendingUser, sendRequest, showToast])

  const handleAccept = useCallback(async (linkId: string) => {
    try {
      await acceptRequest(linkId)
      showToast("Зв'язок підтверджено", 'success')
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
          <span className={styles.sectionTitle}>БЛИЗЬКІ</span>
          {accepted.length > 0 && <span className={styles.sectionCount}>{accepted.length}</span>}
        </div>

        {/* ── Graph ── */}
        {activeProfile && (
          <KynGraph
            me={{ name: activeProfile.name, avatarUrl: activeProfile.avatarUrl ?? null }}
            members={accepted}
            onRemove={handleRemove}
          />
        )}

        {/* ── Pending received ── */}
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

        {/* ── Pending sent ── */}
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

        {/* ── Search + relationship type picker ── */}
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

            {familySearch && searchResults.length === 0 && familySearch.length >= 2 && (
              <p className={styles.familyNoResults}>Нікого не знайдено</p>
            )}

            {/* Relationship type picker — shown after user is selected from search */}
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
                  <button
                    type="button"
                    className={styles.familyRejectBtn}
                    onClick={() => setPendingUser(null)}
                  >
                    ✕
                  </button>
                </div>
                <p className={styles.relationPickerLabel}>ТИП ЗВ'ЯЗКУ</p>
                <div className={styles.relationTypes}>
                  {REL_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      className={styles.relationTypeBtn}
                      onClick={() => handleSendRequest(t.value)}
                      disabled={familyLoading}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <UpgradePrompt feature="familyLink" message="Спільні профілі доступні з плану DUO" />
        )}
      </section>
    </div>
  )
}

export default FamilyTab
