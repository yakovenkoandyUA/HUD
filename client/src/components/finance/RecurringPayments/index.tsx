import React, { useState, useEffect, useCallback, useRef } from 'react'
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
 */

interface RecurringPayment {
  _id: string
  name: string
  amount: number
  dayOfMonth: number
  category: string
  isActive: boolean
}

interface FormState {
  name: string
  amount: string
  dayOfMonth: string
  category: string
}

const EMPTY_FORM: FormState = { name: '', amount: '', dayOfMonth: '', category: 'Підписки' }

const CATEGORIES = ['Підписки', 'Музика', 'Відео', 'Ігри', 'Хмара', 'Комунальні', 'Інше']

interface CategorySelectProps {
  value: string
  onChange: (v: string) => void
}

const CategorySelect: React.FC<CategorySelectProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className={styles.catSelect} ref={ref}>
      <button
        type="button"
        className={styles.catSelectBtn}
        onClick={() => setOpen(v => !v)}
      >
        <span>{value}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`${styles.catChevron} ${open ? styles.catChevronOpen : ''}`}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className={styles.catDropdown}>
          {CATEGORIES.map(c => (
            <button
              key={c}
              type="button"
              className={`${styles.catOption} ${c === value ? styles.catOptionActive : ''}`}
              onClick={() => { onChange(c); setOpen(false) }}
            >
              {c === value && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const KNOWN_SERVICES: Record<string, string> = {
  'netflix':          'netflix.com',
  'spotify':          'spotify.com',
  'youtube':          'youtube.com',
  'youtube premium':  'youtube.com',
  'apple music':      'music.apple.com',
  'apple tv':         'tv.apple.com',
  'icloud':           'icloud.com',
  'google one':       'one.google.com',
  'amazon':           'amazon.com',
  'amazon prime':     'amazon.com',
  'disney':           'disneyplus.com',
  'disney+':          'disneyplus.com',
  'hbo':              'hbomax.com',
  'twitch':           'twitch.tv',
  'discord':          'discord.com',
  'notion':           'notion.so',
  'figma':            'figma.com',
  'github':           'github.com',
  'chatgpt':          'openai.com',
  'claude':           'anthropic.com',
  'midjourney':       'midjourney.com',
  'playstation':      'playstation.com',
  'xbox':             'xbox.com',
  'nintendo':         'nintendo.com',
  'київстар':         'kyivstar.ua',
  'vodafone':         'vodafone.ua',
  'lifecell':         'lifecell.ua',
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
  const logoUrl = domain ? `https://logo.clearbit.com/${domain}` : null

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
  const [payments, setPayments]       = useState<RecurringPayment[]>([])
  const [showAdd, setShowAdd]         = useState(false)
  const [editPayment, setEditPayment] = useState<RecurringPayment | null>(null)
  const [form, setForm]               = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)

  const today = new Date().getDate()

  const fetchPayments = useCallback(async () => {
    try {
      const r = await authFetch('/api/recurring')
      if (r.ok) setPayments(await r.json())
    } catch { /* silent */ }
  }, [])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    const day = parseInt(form.dayOfMonth, 10)
    if (!form.name.trim() || !amount || !day || day < 1 || day > 31) return
    setSaving(true)
    try {
      const r = await authFetch('/api/recurring', {
        method: 'POST',
        body: JSON.stringify({ name: form.name.trim(), amount, dayOfMonth: day, category: form.category }),
      })
      if (r.ok) {
        await fetchPayments()
        setForm(EMPTY_FORM)
        setShowAdd(false)
      }
    } finally { setSaving(false) }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editPayment) return
    const amount = parseFloat(form.amount)
    const day = parseInt(form.dayOfMonth, 10)
    if (!form.name.trim() || !amount || !day || day < 1 || day > 31) return
    setSaving(true)
    try {
      const r = await authFetch(`/api/recurring/${editPayment._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: form.name.trim(), amount, dayOfMonth: day, category: form.category }),
      })
      if (r.ok) {
        await fetchPayments()
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
    setForm({ name: p.name, amount: String(p.amount), dayOfMonth: String(p.dayOfMonth), category: p.category })
    setEditPayment(p)
  }

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setShowAdd(true)
  }

  const totalMonthly = payments.filter(p => p.isActive).reduce((s, p) => s + p.amount, 0)

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
        {payments.map(p => {
          const isToday = p.dayOfMonth === today
          return (
            <button
              key={p._id}
              type="button"
              className={`${styles.row} ${isToday ? styles.rowToday : ''} ${!p.isActive ? styles.rowInactive : ''}`}
              onClick={() => openEdit(p)}
            >
              <ServiceLogo name={p.name} />
              <span className={styles.name}>{p.name}</span>
              <span className={styles.day}>{dayLabel(p.dayOfMonth)}</span>
              <span className={`${styles.amount} ${isToday ? styles.amountToday : ''}`}>
                {fmt(p.amount)} ₴
              </span>
            </button>
          )
        })}
      </div>

      {/* Add form */}
      {showAdd && (
        <form className={styles.addForm} onSubmit={handleAdd}>
          <input
            className={styles.input}
            placeholder="Назва (Spotify...)"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            autoFocus
          />
          <div className={styles.formRow}>
            <input
              className={styles.input}
              type="number"
              placeholder="Сума"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              min="1"
            />
            <input
              className={styles.input}
              type="number"
              placeholder="День (1–31)"
              value={form.dayOfMonth}
              onChange={e => setForm(f => ({ ...f, dayOfMonth: e.target.value }))}
              min="1"
              max="31"
            />
          </div>
          <CategorySelect value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} />
          <div className={styles.formActions}>
            <button type="submit" className={styles.submitBtn} disabled={saving}>Додати</button>
            <button type="button" className={styles.cancelBtn} onClick={() => setShowAdd(false)}>Скасувати</button>
          </div>
        </form>
      )}

      {/* Edit modal */}
      <Modal isOpen={!!editPayment} onClose={() => setEditPayment(null)} title="Редагування" draggable>
        <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            className={styles.input}
            placeholder="Назва"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            autoFocus
          />
          <div className={styles.formRow}>
            <input
              className={styles.input}
              type="number"
              placeholder="Сума"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              min="1"
            />
            <input
              className={styles.input}
              type="number"
              placeholder="День (1–31)"
              value={form.dayOfMonth}
              onChange={e => setForm(f => ({ ...f, dayOfMonth: e.target.value }))}
              min="1"
              max="31"
            />
          </div>
          <CategorySelect value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} />
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
