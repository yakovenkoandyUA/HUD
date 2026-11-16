import React, { useState } from 'react'
import { authFetch } from '@/shared/services/api'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useFinanceStore } from '@/features/finance/store/financeStore'
import { useBankStore } from '@/features/finance/store/bankStore'
import { WALLET_OPTIONS } from '@/features/finance/constants'
import Modal from '@/shared/components/ui/Modal'
import Button from '@/shared/components/ui/Button'
import Input from '@/shared/components/ui/Input'
import PillSelector from '@/shared/components/ui/PillSelector'
import type { WalletId } from '@/shared/types'
import styles from './ProfilePage.module.css'

type Period = 'day' | 'week' | 'month' | 'all'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'day',   label: 'Сьогодні' },
  { value: 'week',  label: '7 днів' },
  { value: 'month', label: '30 днів' },
  { value: 'all',   label: 'Усе' },
]

const PERIOD_LABEL: Record<Period, string> = {
  day: 'за сьогодні', week: 'за останні 7 днів', month: 'за останні 30 днів', all: 'за весь час',
}

const CONFIRM_WORD = 'ВИДАЛИТИ'

/**
 * ClearTransactions
 * -----------------
 * Блок "Очищення транзакцій" у Профіль → Гаманець. Користувач обирає період
 * (сьогодні / 7 днів / 30 днів / усе) і, для профілів з гаманцями, картку.
 * Перед видаленням бекенд (dry-run) повертає точну кількість — вона показується
 * в підтвердженні. Для "Усе" потрібно ввести слово ВИДАЛИТИ.
 *
 * Props: none
 */
const ClearTransactions: React.FC = () => {
  const walletsEnabled = useProfileStore(s => s.activeProfile?.walletsEnabled ?? false)
  const { showToast } = useUiStore()
  const bankConnected = useBankStore(s => !!s.connection)

  const [period, setPeriod]     = useState<Period>('month')
  const [wallet, setWallet]     = useState<WalletId>('sense')
  const [count, setCount]       = useState<number | null>(null)
  const [open, setOpen]         = useState(false)
  const [typed, setTyped]       = useState('')
  const [busy, setBusy]         = useState(false)

  const walletParam = walletsEnabled ? `&walletId=${wallet}` : ''
  // Monobank sync re-imports the last 30 days, so a connected Mono card gets them back on the next Sync
  const monoWillReturn = bankConnected && (!walletsEnabled || wallet === 'mono') && period !== 'all'
  const needsWord = period === 'all'

  const handleStart = async () => {
    setBusy(true)
    try {
      const res = await authFetch(`/api/transactions/bulk?period=${period}${walletParam}&dryRun=1`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      const { count: n } = await res.json() as { count: number }
      if (n === 0) { showToast('Немає транзакцій за цей період', 'info'); return }
      setCount(n)
      setTyped('')
      setOpen(true)
    } catch {
      showToast('Не вдалося перевірити транзакції', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleConfirm = async () => {
    if (needsWord && typed.trim().toUpperCase() !== CONFIRM_WORD) return
    setBusy(true)
    try {
      const res = await authFetch(`/api/transactions/bulk?period=${period}${walletParam}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      const { deleted } = await res.json() as { deleted: number }
      setOpen(false)
      await useFinanceStore.getState().fetchTransactions()
      showToast(`Видалено ${deleted} транзакцій`, 'success')
    } catch {
      showToast('Не вдалося видалити транзакції', 'error')
    } finally {
      setBusy(false)
    }
  }

  const walletName = WALLET_OPTIONS.find(o => o.value === wallet)?.label

  return (
    <div className={styles.settingsCard}>
      <div className={styles.cardTitle}>ОЧИЩЕННЯ ТРАНЗАКЦІЙ</div>
      <div className={`${styles.cardPadded} ${styles.clearBody}`}>
        <PillSelector options={PERIOD_OPTIONS} value={period} onChange={setPeriod} columns={4} />
        {walletsEnabled && (
          <>
            <span className={styles.pushSub}>Картка</span>
            <PillSelector options={WALLET_OPTIONS} value={wallet} onChange={setWallet} columns={2} />
          </>
        )}
        <Button fullWidth onClick={handleStart} disabled={busy}>Очистити</Button>
      </div>

      <Modal isOpen={open} onClose={() => !busy && setOpen(false)} title="Видалити транзакції?" draggable>
        <div className={styles.clearBody}>
          <p className={styles.cardRowLabel}>
            Буде видалено <strong>{count}</strong> транзакцій {PERIOD_LABEL[period]}
            {walletsEnabled ? ` (картка ${walletName})` : ''}. Це незворотно.
          </p>
          <p className={styles.pushSub}>
            Транзакції, прив'язані до просторів, зникнуть і звідти.
            {monoWillReturn && ' Monobank-синк підтягне останні 30 днів знову при наступному Sync.'}
          </p>
          {needsWord && (
            <Input label={`Введи ${CONFIRM_WORD} для підтвердження`} value={typed} onChange={setTyped} />
          )}
          <Button
            fullWidth
            onClick={handleConfirm}
            disabled={busy || (needsWord && typed.trim().toUpperCase() !== CONFIRM_WORD)}
          >
            {busy ? 'Видаляю...' : 'Видалити'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default ClearTransactions
