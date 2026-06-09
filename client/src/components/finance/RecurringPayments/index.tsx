import React, { useState, useEffect, useCallback } from 'react'
import { authFetch } from '../../../services/api'
import { fmt } from '../../../utils/finance'
import Modal from '../../ui/Modal'
import styles from './RecurringPayments.module.css'

/**
 * RecurringPayments
 * -----------------
 * Список регулярних платежів (підписки, комунальні тощо).
 * Підсвічує платіж якщо сьогодні його день.
 * Тап на платіж → модалка редагування.
 * Показує перші 4, решта — "Ще N платежів".
 * Підтримує валюти UAH / USD / EUR з конвертацією за поточним курсом.
 */

const CURRENCIES = ['UAH', 'USD', 'EUR'] as const
type Currency = typeof CURRENCIES[number]
const CURRENCY_SYMBOL: Record<Currency, string> = { UAH: '₴', USD: '$', EUR: '€' }
const VISIBLE_LIMIT = 4

interface RecurringPayment {
  _id: string
  name: string
  amount: number
  amountForeign?: number | null
  currency?: Currency
  dayOfMonth: number
  category: string
  isActive: boolean
}

interface FormState {
  name: string
  amount: string
  dayOfMonth: string
}

interface FormErrors {
  name?: string
  amount?: string
  dayOfMonth?: string
}

const EMPTY_FORM: FormState = { name: '', amount: '', dayOfMonth: '' }

function validatePaymentForm(form: FormState): FormErrors {
  const errs: FormErrors = {}
  if (!form.name.trim()) errs.name = 'Введіть назву'
  const amt = parseFloat(form.amount)
  if (!amt || amt <= 0) errs.amount = 'Введіть суму'
  const day = parseInt(form.dayOfMonth, 10)
  if (!day || day < 1 || day > 31) errs.dayOfMonth = 'День від 1 до 31'
  return errs
}

function hiddenLabel(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return `Ще ${n} платіж`
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return `Ще ${n} платежі`
  return `Ще ${n} платежів`
}

const KNOWN_SERVICES: Record<string, string> = {
	netflix: 'netflix.com',
	spotify: 'spotify.com',
	youtube: 'youtube.com',
	'youtube premium': 'youtube.com',
	'apple music': 'music.apple.com',
	'apple tv': 'tv.apple.com',
	icloud: 'icloud.com',
	'google one': 'one.google.com',
	amazon: 'amazon.com',
	'amazon prime': 'amazon.com',
	disney: 'disneyplus.com',
	'disney+': 'disneyplus.com',
	hbo: 'hbomax.com',
	twitch: 'twitch.tv',
	discord: 'discord.com',
	notion: 'notion.so',
	figma: 'figma.com',
	github: 'github.com',
	chatgpt: 'openai.com',
	claude: 'anthropic.com',
	midjourney: 'midjourney.com',
	playstation: 'playstation.com',
	xbox: 'xbox.com',
	nintendo: 'nintendo.com',
	київстар: 'kyivstar.ua',
	vodafone: 'vodafone.ua',
	lifecell: 'lifecell.ua',
	patreon: 'patreon.com',
}

function getCategoryEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('музик') || n.includes('music')) return '🎵'
  if (n.includes('відео') || n.includes('video') || n.includes('tv')) return '🎬'
  if (n.includes('гр') || n.includes('game')) return '🎮'
  if (n.includes('хмар') || n.includes('cloud') || n.includes('storage')) return '☁️'
  if (n.includes("зв'яз") || n.includes('мобіл')) return '📱'
  return '💳'
}

const ServiceLogo: React.FC<{ name: string }> = ({ name }) => {
  const [imgError, setImgError] = useState(false)
  const domain = KNOWN_SERVICES[name.toLowerCase().trim()]
  const logoUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={styles.serviceLogo}
        onError={() => setImgError(true)}
      />
    )
  }
  return <span className={styles.serviceEmoji}>{getCategoryEmoji(name)}</span>
}

function dayLabel(day: number): string {
  return `${day}-го`
}

const RecurringPayments: React.FC = () => {
  const [payments, setPayments]         = useState<RecurringPayment[]>([])
  const [showAll, setShowAll]           = useState(false)
  const [showAdd, setShowAdd]           = useState(false)
  const [editPayment, setEditPayment]   = useState<RecurringPayment | null>(null)
  const [form, setForm]                 = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors]             = useState<FormErrors>({})
  const [saving, setSaving]             = useState(false)
  const [currency, setCurrency]         = useState<Currency>('UAH')
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [rateLoading, setRateLoading]   = useState(false)

  const today = new Date().getDate()

  const fetchPayments = useCallback(async () => {
    try {
      const r = await authFetch('/api/recurring')
      if (r.ok) setPayments(await r.json())
    } catch { /* silent */ }
  }, [])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  useEffect(() => {
    if (currency === 'UAH') {
      setExchangeRate(null)
      setRateLoading(false)
      return
    }

    let cancelled = false

    const fetchRate = async () => {
      setRateLoading(true)
      try {
        const r = await fetch(`https://api.exchangerate-api.com/v4/latest/${currency}`)
        const data = await r.json()
        if (!cancelled) {
          setExchangeRate(data.rates.UAH)
          setRateLoading(false)
        }
      } catch {
        if (!cancelled) {
          setExchangeRate(null)
          setRateLoading(false)
        }
      }
    }

    fetchRate()

    return () => { cancelled = true }
  }, [currency])

  // Fix 2: sync form state when editPayment changes (incl. after background refresh)
  useEffect(() => {
    if (!editPayment) return
    setForm({
      name: editPayment.name,
      amount: String(editPayment.amountForeign ?? editPayment.amount),
      dayOfMonth: String(editPayment.dayOfMonth),
    })
    setCurrency(editPayment.currency ?? 'UAH')
    setErrors({})
  }, [editPayment])

  const amountForeignNum = parseFloat(form.amount) || 0
  const amountUAH = currency === 'UAH'
    ? amountForeignNum
    : exchangeRate
      ? Math.round(amountForeignNum * exchangeRate)
      : null

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validatePaymentForm(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    const amountForeign = parseFloat(form.amount)
    const amount = amountUAH ?? amountForeign
    const day = parseInt(form.dayOfMonth, 10)
    setSaving(true)
    try {
      const r = await authFetch('/api/recurring', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          amount,
          amountForeign: currency !== 'UAH' ? amountForeign : undefined,
          currency,
          dayOfMonth: day,
        }),
      })
      if (r.ok) {
        await fetchPayments()
        setForm(EMPTY_FORM)
        setCurrency('UAH')
        setShowAdd(false)
      }
    } finally { setSaving(false) }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editPayment) return
    const errs = validatePaymentForm(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    const amountForeign = parseFloat(form.amount)
    const amount = amountUAH ?? amountForeign
    const day = parseInt(form.dayOfMonth, 10)
    setSaving(true)
    try {
      const r = await authFetch(`/api/recurring/${editPayment._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name.trim(),
          amount,
          amountForeign: currency !== 'UAH' ? amountForeign : null,
          currency,
          dayOfMonth: day,
        }),
      })
      if (r.ok) {
        const updated: RecurringPayment = {
          ...editPayment,
          name: form.name.trim(),
          amount,
          amountForeign: currency !== 'UAH' ? amountForeign : null,
          currency,
          dayOfMonth: day,
        }
        setPayments(prev => prev.map(p => p._id === editPayment._id ? updated : p))
        setEditPayment(null)
      }
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!editPayment) return
    await authFetch(`/api/recurring/${editPayment._id}`, { method: 'DELETE' })
    await fetchPayments()
    setEditPayment(null)
  }

  const openEdit = (p: RecurringPayment) => {
    setForm({
      name: p.name,
      amount: String(p.amountForeign ?? p.amount),
      dayOfMonth: String(p.dayOfMonth),
    })
    setCurrency(p.currency ?? 'UAH')
    setErrors({})
    setEditPayment(p)
  }

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setCurrency('UAH')
    setErrors({})
    setShowAdd(true)
  }

  const setField = (field: keyof FormState, value: string) => {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) {
      const valid =
        field === 'name'       ? value.trim() !== '' :
        field === 'amount'     ? (parseFloat(value) > 0) :
        field === 'dayOfMonth' ? (() => { const d = parseInt(value, 10); return d >= 1 && d <= 31 })() :
        true
      if (valid) setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const totalMonthly = payments.filter(p => p.isActive).reduce((s, p) => s + p.amount, 0)
  const visiblePayments = showAll ? payments : payments.slice(0, VISIBLE_LIMIT)
  const hiddenCount = payments.length - VISIBLE_LIMIT

  const formFields = (
    <>
      <div>
        <input
          className={`${styles.input} ${errors.name ? 'inputError' : ''}`}
          placeholder="Назва (Spotify...)"
          value={form.name}
          onChange={e => setField('name', e.target.value)}
          autoFocus
        />
        {errors.name && <span className="errorMsg">{errors.name}</span>}
      </div>

      <div className={styles.currencySwitch}>
        {CURRENCIES.map(c => (
          <button
            key={c}
            type="button"
            className={`${styles.currencyBtn} ${currency === c ? styles.currencyActive : ''}`}
            onClick={() => setCurrency(c)}
          >
            {CURRENCY_SYMBOL[c]} {c}
          </button>
        ))}
      </div>

      <div className={styles.formRow}>
        <div>
          <input
            className={`${styles.input} ${errors.amount ? 'inputError' : ''}`}
            type="number"
            placeholder={`Сума, ${CURRENCY_SYMBOL[currency]}`}
            value={form.amount}
            onChange={e => setField('amount', e.target.value)}
          />
          {errors.amount && <span className="errorMsg">{errors.amount}</span>}
        </div>
        <div>
          <input
            className={`${styles.input} ${errors.dayOfMonth ? 'inputError' : ''}`}
            type="number"
            placeholder="День (1–31)"
            value={form.dayOfMonth}
            onChange={e => setField('dayOfMonth', e.target.value)}
          />
          {errors.dayOfMonth && <span className="errorMsg">{errors.dayOfMonth}</span>}
        </div>
      </div>

      {currency !== 'UAH' && (
        <div className={styles.conversionHint}>
          {rateLoading
            ? 'Завантаження курсу...'
            : exchangeRate && amountUAH && amountForeignNum > 0
              ? `≈ ${amountUAH.toLocaleString('uk-UA')} ₴ (курс ${exchangeRate.toFixed(1)} ₴/${currency})`
              : exchangeRate
                ? `Курс: ${exchangeRate.toFixed(1)} ₴/${currency}`
                : 'Курс недоступний'
          }
        </div>
      )}
    </>
  )

  if (payments.length === 0 && !showAdd) {
    return (
      <div className={styles.wrap}>
        <div className={styles.header}>
          <span className={styles.title}>Регулярні платежі</span>
          <button type="button" className={styles.addBtn} onClick={openAdd}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Додати
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>Регулярні платежі</span>
          {totalMonthly > 0 && (
            <span className={styles.total}>{fmt(totalMonthly)} ₴/міс</span>
          )}
        </div>
        <button type="button" className={styles.addBtn} onClick={openAdd}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Додати
        </button>
      </div>

      <div className={styles.list}>
        {visiblePayments.map((p, i) => {
          const isToday = p.dayOfMonth === today
          const hasForeign = p.currency && p.currency !== 'UAH' && p.amountForeign
          const isRevealed = showAll && i >= VISIBLE_LIMIT
          return (
            <button
              key={p._id}
              type="button"
              className={`${styles.row} ${isToday ? styles.rowToday : ''} ${!p.isActive ? styles.rowInactive : ''} ${isRevealed ? styles.rowRevealed : ''}`}
              style={isRevealed ? { animationDelay: `${(i - VISIBLE_LIMIT) * 0.06}s` } : undefined}
              onClick={() => openEdit(p)}
            >
              <ServiceLogo name={p.name} />
              <span className={styles.name}>{p.name}</span>
              <span className={styles.day}>{dayLabel(p.dayOfMonth)}</span>
              {hasForeign ? (
                <span className={`${styles.amount} ${isToday ? styles.amountToday : ''}`}>
                  {CURRENCY_SYMBOL[p.currency as Currency]}{p.amountForeign}
                </span>
              ) : (
                <span className={`${styles.amount} ${isToday ? styles.amountToday : ''}`}>
                  {fmt(p.amount)} ₴
                </span>
              )}
            </button>
          )
        })}
      </div>

      {payments.length > VISIBLE_LIMIT && (
        <button
          type="button"
          className={styles.showMoreBtn}
          onClick={() => setShowAll(v => !v)}
        >
          {showAll ? 'Згорнути' : hiddenLabel(hiddenCount)}
          <i className={`ti ${showAll ? 'ti-chevron-up' : 'ti-chevron-down'}`} aria-hidden="true" />
        </button>
      )}

      {showAdd && (
        <form className={styles.addForm} onSubmit={handleAdd}>
          {formFields}
          <div className={styles.formActions}>
            <button type="submit" className={styles.submitBtn} disabled={saving}>Додати</button>
            <button type="button" className={styles.cancelBtn} onClick={() => setShowAdd(false)}>Скасувати</button>
          </div>
        </form>
      )}

      <Modal isOpen={!!editPayment} onClose={() => setEditPayment(null)} title="Редагування" draggable>
        {/* Fix 1: key forces form DOM reset when switching between payments */}
        <form key={editPayment?._id ?? ''} onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {formFields}
          <div className={styles.formActions}>
            <button type="submit" className={styles.submitBtn} disabled={saving}>Зберегти</button>
            <button type="button" className={styles.deleteBtn} onClick={handleDelete}>Видалити</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default RecurringPayments
