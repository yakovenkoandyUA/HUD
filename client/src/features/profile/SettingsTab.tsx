import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { authFetch } from '@/shared/services/api'
import LegalDocModal from '@/shared/components/ui/LegalDocModal'
import styles from './SettingsTab.module.css'

const LS_TERMS   = 'mimir-terms-confirmed'
const LS_PRIVACY = 'mimir-privacy-confirmed'

/**
 * SettingsTab
 * -----------
 * Вкладка "Налаштування" у ProfilePage.
 * Містить: Export даних (JSON), юридичні документи (Terms/Privacy у модалці),
 * видалення акаунту (soft delete).
 */
const SettingsTab: React.FC = () => {
  const navigate = useNavigate()
  const { showToast } = useUiStore()
  const { logout } = useProfileStore()

  const [exporting, setExporting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showDeleteZone, setShowDeleteZone] = useState(false)

  const [legalOpen, setLegalOpen]         = useState<'terms' | 'privacy' | null>(null)
  const [termsConfirmed, setTermsConfirmed]   = useState(() => localStorage.getItem(LS_TERMS) === '1')
  const [privacyConfirmed, setPrivacyConfirmed] = useState(() => localStorage.getItem(LS_PRIVACY) === '1')

  const handleLegalConfirm = (type: 'terms' | 'privacy') => {
    if (type === 'terms') {
      localStorage.setItem(LS_TERMS, '1')
      setTermsConfirmed(true)
    } else {
      localStorage.setItem(LS_PRIVACY, '1')
      setPrivacyConfirmed(true)
    }
  }

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const res = await authFetch('/api/user/export')
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const date = new Date().toISOString().slice(0, 10)
      const a = document.createElement('a')
      a.href = url
      a.download = `mimir-export-${date}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Дані успішно експортовано', 'success')
    } catch {
      showToast('Помилка експорту. Спробуйте ще раз.', 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE' || deleting) return
    setDeleting(true)
    try {
      const res = await authFetch('/api/user/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        showToast(data.error ?? 'Помилка видалення', 'error')
        return
      }
      showToast('Запит на видалення прийнято', 'info')
      logout()
      navigate('/login')
    } catch {
      showToast("Помилка з'єднання. Спробуйте ще раз.", 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={styles.root}>

      {/* ── Export ── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v9M5 8l3 3 3-3"/>
            <path d="M2 13h12"/>
          </svg>
          <h2 className={styles.sectionTitle}>Експорт даних</h2>
        </div>
        <p className={styles.sectionDesc}>
          Завантажте всі ваші дані у форматі JSON — спогади, фінанси, рецепти, звички, нотатки та інше. Паролі і токени не включаються.
        </p>
        <button
          type="button"
          className={styles.exportBtn}
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <span className={styles.spinner} />
          ) : (
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v9M5 8l3 3 3-3"/>
              <path d="M2 13h12"/>
            </svg>
          )}
          {exporting ? 'Підготовка...' : 'Завантажити мої дані (JSON)'}
        </button>
      </section>

      {/* ── Legal docs ── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="1" width="12" height="14" rx="1.5"/>
            <path d="M5 5h6M5 8h6M5 11h4"/>
          </svg>
          <h2 className={styles.sectionTitle}>Юридична інформація</h2>
        </div>
        <div className={styles.legalLinks}>
          <div className={styles.legalRow}>
            <button type="button" className={styles.legalLink} onClick={() => setLegalOpen('terms')}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 1.5h8M2 4.5h8M2 7.5h5"/>
              </svg>
              Умови користування
            </button>
            <button
              type="button"
              className={`${styles.legalCheck} ${termsConfirmed ? styles.legalCheckDone : ''}`}
              title={termsConfirmed ? 'Ознайомлений' : 'Прочитайте документ'}
              onClick={() => !termsConfirmed && setLegalOpen('terms')}
            >
              {termsConfirmed
                ? <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5l3 3 6-6"/></svg>
                : <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="9" height="9" rx="2"/></svg>
              }
            </button>
          </div>
          <div className={styles.legalRow}>
            <button type="button" className={styles.legalLink} onClick={() => setLegalOpen('privacy')}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 1L2 3v3c0 2.5 1.8 4.7 4 5.4C8.2 10.7 10 8.5 10 6V3L6 1z"/>
              </svg>
              Політика конфіденційності
            </button>
            <button
              type="button"
              className={`${styles.legalCheck} ${privacyConfirmed ? styles.legalCheckDone : ''}`}
              title={privacyConfirmed ? 'Ознайомлений' : 'Прочитайте документ'}
              onClick={() => !privacyConfirmed && setLegalOpen('privacy')}
            >
              {privacyConfirmed
                ? <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5l3 3 6-6"/></svg>
                : <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="9" height="9" rx="2"/></svg>
              }
            </button>
          </div>
        </div>
      </section>

      <LegalDocModal
        isOpen={legalOpen !== null}
        type={legalOpen ?? 'terms'}
        onClose={() => setLegalOpen(null)}
        onConfirm={() => { if (legalOpen) handleLegalConfirm(legalOpen) }}
      />

      {/* ── Danger zone ── */}
      <section className={`${styles.section} ${styles.dangerSection}`}>
        <div className={styles.sectionHead}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2L1.5 13h13L8 2z"/>
            <path d="M8 6.5v3"/>
            <circle cx="8" cy="11" r="0.7" fill="currentColor" stroke="none"/>
          </svg>
          <h2 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>Небезпечна зона</h2>
        </div>

        {!showDeleteZone ? (
          <button
            type="button"
            className={styles.dangerToggleBtn}
            onClick={() => setShowDeleteZone(true)}
          >
            Видалити акаунт
          </button>
        ) : (
          <div className={styles.deleteZone}>
            <p className={styles.deleteWarning}>
              Після підтвердження акаунт буде <strong>заблоковано</strong> і позначений для видалення. Дані зберігатимуться 30 днів, після чого будуть видалені <strong>безповоротно</strong>.
            </p>
            <p className={styles.deleteWarning}>
              Для підтвердження введіть <code className={styles.deleteCode}>DELETE</code> у поле нижче:
            </p>
            <input
              type="text"
              className={styles.deleteInput}
              placeholder="DELETE"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <div className={styles.deleteActions}>
              <button
                type="button"
                className={styles.deleteCancelBtn}
                onClick={() => { setShowDeleteZone(false); setDeleteConfirm('') }}
              >
                Скасувати
              </button>
              <button
                type="button"
                className={styles.deleteConfirmBtn}
                onClick={handleDelete}
                disabled={deleteConfirm !== 'DELETE' || deleting}
              >
                {deleting ? 'Обробка...' : 'Видалити акаунт'}
              </button>
            </div>
          </div>
        )}
      </section>

    </div>
  )
}

export default SettingsTab
