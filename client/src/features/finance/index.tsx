import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import AppHeader from '@/shared/components/layout/AppHeader'
import BalanceHero from './components/finance/BalanceHero'
import GoalsList from './components/finance/GoalsList'
import TopupForm from './components/finance/TopupForm'
import ExpenseForm from './components/finance/ExpenseForm'
import TransactionList from './components/finance/TransactionList'
// import ExpenseChart from './components/finance/ExpenseChart'
import MonthlyReport from './components/finance/MonthlyReport'
import RecurringPayments from './components/finance/RecurringPayments'
import ShoppingTracker from './components/finance/ShoppingTracker'
import MonoHero from './components/finance/MonoHero'
import Modal from '@/shared/components/ui/Modal'
import { WALLET_OPTIONS } from './constants'
import type { WalletId } from '@/shared/types'
import { useFinanceStore } from '@/features/finance/store/financeStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { useBankStore } from '@/features/finance/store/bankStore'
import { useRecurringPaymentStore } from '@/features/finance/store/recurringPaymentStore'
import { getDaysLeftInMonth, getDaysElapsed, calcDailyBudget, getPeriodStart, calcSalaryForecast } from './utils/finance'
import { getToken } from '@/shared/services/api'
import { useAchievementsStore } from '@/shared/store/achievementsStore'
import MimirHint from '@/shared/components/ui/MimirHint'
import { MIMIR_DIALOGUE, getMimirText } from '@/shared/data/mimirDialogue'
import { getMimirHistory, isDailyEligible, markDailyShown } from '@/shared/utils/mimirHistory'
import styles from './Finance.module.css'

const IconExpense: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path d="M7.5 2v11M3 9.5l4.5 4 4.5-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IconTopup: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path d="M7.5 13V2M3 5.5l4.5-4 4.5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const Finance: React.FC = () => {
  const { balance, transactions, monoTransactions, addTopup, addExpense, deleteTransaction, fetchTransactions } = useFinanceStore()
  const { showToast, mimirMode } = useUiStore()
  // Multi-wallet is opt-in per profile; without the flag the screen behaves exactly as before.
  const walletsEnabled = useProfileStore(s => s.activeProfile?.walletsEnabled ?? false)
  const [wallet, setWallet] = useState<WalletId>('sense')
  const activeWallet: WalletId = walletsEnabled ? wallet : 'sense'
  const monoView = activeWallet === 'mono'
  const salaryDay = useProfileStore(s => s.activeProfile?.salaryDay ?? 1)
  const userId    = useProfileStore(s => s.activeProfile?.id ?? '')
  const { connection, syncing, importing, fetchStatus, sync, importCsv, recategorize } = useBankStore()
  const { payments: recurringPayments, fetchPayments: fetchRecurringPayments } = useRecurringPaymentStore()

  const [showTopup, setShowTopup]     = useState(false)
  const [showExpense, setShowExpense] = useState(false)
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [showFinanceEmpty, setShowFinanceEmpty] = useState(false)

  const csvInputRef = useRef<HTMLInputElement>(null)
  const transactionsRef = useRef(transactions)
  const financeEmptyDecided = useRef(false)

  useEffect(() => { transactionsRef.current = transactions }, [transactions])

  // Decide once, 800ms after userId is known, using up-to-date transaction count
  useEffect(() => {
    if (!userId || financeEmptyDecided.current) return
    const t = setTimeout(() => {
      if (financeEmptyDecided.current) return
      financeEmptyDecided.current = true
      if (transactionsRef.current.length === 0) {
        const h = getMimirHistory(userId)
        if (isDailyEligible(h, 'finance_empty')) setShowFinanceEmpty(true)
      }
    }, 800)
    return () => clearTimeout(t)
  }, [userId])

  useEffect(() => {
    if (!getToken()) return
    let cancelled = false
    const init = async () => {
      fetchTransactions()
      fetchRecurringPayments()
      await fetchStatus()
      if (cancelled) return
      // Auto-sync if bank connected — silent background refresh
      if (!useBankStore.getState().connection) return
      try {
        const { imported } = await useBankStore.getState().sync()
        if (!cancelled && imported > 0) {
          fetchTransactions()
          showToast(`Monobank: +${imported} нових транзакцій`, 'success')
        }
      } catch { /* silent fail — user can retry manually */ }
    }
    init()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSync = useCallback(async () => {
    try {
      const { imported } = await sync()
      if (imported > 0) {
        fetchTransactions()
        showToast(`Імпортовано ${imported} транзакцій`, 'success')
      } else {
        showToast('Нових транзакцій немає', 'info')
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Помилка синхронізації', 'error')
    }
  }, [sync, fetchTransactions, showToast])

  const handleCsvFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Monobank exports in Windows-1251; detect by checking for Cyrillic after UTF-8 decode
    const buf = await file.arrayBuffer()
    let text = new TextDecoder('utf-8').decode(buf)
    if (!/[а-яА-ЯіІїЇєЄ]/.test(text)) {
      text = new TextDecoder('windows-1251').decode(buf)
    }
    e.target.value = ''
    try {
      const { imported } = await importCsv(text, activeWallet)
      fetchTransactions()
      setShowCsvModal(false)
      showToast(imported > 0 ? `Імпортовано ${imported} транзакцій` : 'Нових транзакцій не знайдено', imported > 0 ? 'success' : 'info')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Помилка імпорту', 'error')
    }
  }, [importCsv, activeWallet, fetchTransactions, showToast])

  const formatLastSync = (iso: string | null) => {
    if (!iso) return null
    const d = new Date(iso)
    const isToday = d.toDateString() === new Date().toDateString()
    const time = d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
    return isToday ? time : d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }) + ' ' + time
  }

  // Mono balance: live from the Monobank API when connected, otherwise the sum of its recorded transactions.
  const monoBalance = connection?.balance
    ?? monoTransactions.reduce((sum, t) => (t.type === 'topup' ? sum + t.amount : sum - t.amount), 0)

  const daysLeft = getDaysLeftInMonth(salaryDay)
  const daysElapsed = getDaysElapsed(salaryDay)
  const dailyBudget = calcDailyBudget(balance, salaryDay)

  const today = new Date().toISOString().slice(0, 10)
  const todaySpent = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(today))
    .reduce((s, t) => s + t.amount, 0)

  const periodStart = getPeriodStart(salaryDay)
  const totalTopup = transactions
    .filter((t) => t.type === 'topup' && t.date >= periodStart)
    .reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions
    .filter((t) => t.type === 'expense' && t.date >= periodStart)
    .reduce((s, t) => s + t.amount, 0)

  const avgPerDay = daysElapsed > 0 ? Math.round(totalExpense / daysElapsed) : 0

  const salaryForecast = useMemo(
    () => calcSalaryForecast(balance, transactions, recurringPayments, salaryDay).projected,
    [balance, transactions, recurringPayments, salaryDay],
  )

  const handleTopup = (amount: number, description: string, category: string, spaceId?: string | null, walletId?: WalletId, date?: string) => {
    addTopup(amount, description, category, spaceId, walletId, date)
    useAchievementsStore.getState().unlock('first-transaction')
    setShowTopup(false)
    showToast(`+${amount} ₴ додано`, 'success')
  }

  const handleExpense = (amount: number, description: string, category?: string, spaceId?: string | null, subcategory?: string | null, date?: string, walletId?: WalletId) => {
    addExpense(amount, description, category, null, spaceId, subcategory, date, walletId)
    useAchievementsStore.getState().unlock('first-transaction')
    setShowExpense(false)
    showToast(`−${amount} ₴ витрачено`, 'info')
  }

  const [recategorizing, setRecategorizing] = useState(false)

  const handleRecategorize = useCallback(async () => {
    setRecategorizing(true)
    try {
      const { updated } = await recategorize()
      await fetchTransactions()
      showToast(updated > 0 ? `Категоризовано ${updated} транзакцій` : 'Всі транзакції вже категоризовані', 'success')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Помилка категоризації', 'error')
    } finally {
      setRecategorizing(false)
    }
  }, [recategorize, fetchTransactions, showToast])

  const handleDelete = (id: string) => {
    deleteTransaction(id)
    showToast('Транзакцію видалено', 'info')
  }

  return (
		<div className={styles.screen}>
			<AppHeader />
				{walletsEnabled && (
					<div className={styles.walletTabs}>
						{WALLET_OPTIONS.map(opt => (
							<button
								key={opt.value}
								type="button"
								className={`${styles.walletTab} ${activeWallet === opt.value ? styles.walletTabActive : ''}`}
								onClick={() => setWallet(opt.value)}
							>
								{opt.label}
							</button>
						))}
					</div>
				)}
			<div className={styles.content}>

				{/* 1. Баланс + статистика (єдиний hero) */}
				{monoView ? (
					<MonoHero
						balance={monoBalance}
						live={connection?.balance != null}
						lastSync={connection?.lastSync ? formatLastSync(connection.lastSync) : null}
					/>
				) : (
					<BalanceHero
						balance={balance}
						dailyBudget={dailyBudget}
						monthSpent={totalExpense}
						totalTopup={totalTopup}
						avgPerDay={avgPerDay}
						daysLeft={daysLeft}
						todaySpent={todaySpent}
						salaryForecast={salaryForecast}
					/>
				)}

				<div className={styles.mimirFloat}>
					{showFinanceEmpty ? (
						<MimirHint
							pose={MIMIR_DIALOGUE.finance_empty.pose}
							textKey={getMimirText('finance_empty', mimirMode)}
							onDismiss={() => { setShowFinanceEmpty(false); markDailyShown(userId, 'finance_empty') }}
						/>
					) : (
						<MimirHint pose={transactions.length === 0 ? 'sleeping' : 'writing'} />
					)}
				</div>

				{/* 2. Швидкі дії */}
				<div className={styles.actions}>
					<button className={styles.btnExpense} onClick={() => setShowExpense(true)}>
						<IconExpense />
						Витрата
					</button>
					<button className={styles.btnTopup} onClick={() => setShowTopup(true)}>
						<IconTopup />
						Поповнення
					</button>
				</div>

				{/* Аналітика, цілі й регулярні платежі — тільки для головного гаманця (Sense) */}
				{!monoView && (
					<>
						{/* 4. Місячна аналітика + AI */}
						<MonthlyReport transactions={transactions} />

						{/* 5. Donut chart категорій */}
						<ShoppingTracker transactions={transactions} />

						{/* 6. Цілі накопичення */}
						<GoalsList />

						{/* 7. Регулярні платежі */}
						<RecurringPayments />
					</>
				)}

				<div className={styles.section}>
					{/* Для walletsEnabled sync-бар Monobank живе тільки на вкладці Mono */}
					{(!walletsEnabled || monoView) && connection && (
						<div className={styles.bankSyncBar}>
							<span className={styles.bankSyncLabel}>
								<span className={styles.bankSyncDot} />
								Monobank
								{connection.lastSync && (
									<span className={styles.bankSyncTime}> · {formatLastSync(connection.lastSync)}</span>
								)}
							</span>
							<div className={styles.bankSyncActions}>
								<button
									type="button"
									className={styles.bankSyncBtn}
									onClick={handleSync}
									disabled={syncing}
								>
									{syncing ? '...' : 'Sync'}
								</button>
								<button
									type="button"
									className={styles.bankCsvBtn}
									onClick={() => setShowCsvModal(true)}
								>
									CSV
								</button>
							</div>
						</div>
					)}
					{(!walletsEnabled || monoView) && !connection && (
						<div className={styles.bankSyncBar}>
							<span className={styles.bankSyncLabel} style={{ color: 'var(--text3)' }}>Банк не підключено</span>
							<button type="button" className={styles.bankCsvBtn} onClick={() => setShowCsvModal(true)}>
								Імпорт CSV
							</button>
						</div>
					)}
					{/* Sense не має API банку — для нього тільки імпорт виписки CSV */}
					{walletsEnabled && !monoView && (
						<div className={styles.bankSyncBar}>
							<span className={styles.bankSyncLabel} style={{ color: 'var(--text3)' }}>Sense</span>
							<button type="button" className={styles.bankCsvBtn} onClick={() => setShowCsvModal(true)}>
								Імпорт CSV
							</button>
						</div>
					)}
					<TransactionList transactions={monoView ? monoTransactions : transactions} onDelete={handleDelete} />
				</div>
			</div>

			<Modal isOpen={showTopup} onClose={() => setShowTopup(false)} title="Поповнення" draggable>
				<TopupForm onTopup={handleTopup} showWalletPicker={walletsEnabled} defaultWalletId={activeWallet} />
			</Modal>

			<Modal isOpen={showExpense} onClose={() => setShowExpense(false)} title="Витрата" draggable>
				<ExpenseForm onExpense={handleExpense} showWalletPicker={walletsEnabled} defaultWalletId={activeWallet} />
			</Modal>

			<Modal isOpen={showCsvModal} onClose={() => setShowCsvModal(false)} title="Імпорт виписки" draggable>
				<div className={styles.csvModalBody}>
					<p className={styles.csvModalHint}>
						Завантаж CSV-виписку з Monobank (Виписка → Поділитись → CSV).
					</p>
					<input
						ref={csvInputRef}
						type="file"
						accept=".csv,.txt"
						className={styles.csvFileInput}
						onChange={handleCsvFile}
						disabled={importing}
					/>
					<label
						className={`${styles.csvFileLabel} ${importing ? styles.csvFileLabelDisabled : ''}`}
						onClick={() => csvInputRef.current?.click()}
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
							<polyline points="17 8 12 3 7 8"/>
							<line x1="12" y1="3" x2="12" y2="15"/>
						</svg>
						{importing ? 'Імпортую...' : 'Обрати файл'}
					</label>
					<button
						className={`${styles.csvFileLabel} ${recategorizing ? styles.csvFileLabelDisabled : ''}`}
						onClick={handleRecategorize}
						disabled={recategorizing}
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M4 4v5h5M20 20v-5h-5"/>
							<path d="M4 9a8 8 0 0 1 14.93-2M20 15a8 8 0 0 1-14.93 2"/>
						</svg>
						{recategorizing ? 'Категоризую...' : 'Авто-категоризація'}
					</button>
				</div>
			</Modal>
		</div>
	)
}

export default Finance
