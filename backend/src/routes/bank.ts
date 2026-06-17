import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { requireAuth } from '../middleware/auth'
import BankConnection from '../models/BankConnection'
import Transaction from '../models/Transaction'

const router = Router()

// ── Encryption helpers (AES-256-GCM) ────────────────────────────────────────

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error('ENCRYPTION_KEY not set')
  return Buffer.from(key, 'hex')
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

function decrypt(encryptedText: string): string {
  const [ivHex, tagHex, dataHex] = encryptedText.split(':')
  const iv  = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv)
  decipher.setAuthTag(tag)
  return decipher.update(data).toString('utf8') + decipher.final('utf8')
}

// ── Monobank helpers ─────────────────────────────────────────────────────────

const MONO_BASE = 'https://api.monobank.ua'

interface MonoAccount {
  id: string
  balance: number
  creditLimit: number
  type: string
  currencyCode: number
  maskedPan: string[]
  iban: string
}

interface MonoClientInfo {
  name: string
  accounts: MonoAccount[]
}

interface MonoStatement {
  id: string
  time: number
  description: string
  mcc: number
  amount: number
  currencyCode: number
  balance: number
  comment?: string
  counterName?: string
}

async function monoFetch(path: string, token: string) {
  const res = await fetch(`${MONO_BASE}${path}`, {
    headers: { 'X-Token': token },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Monobank ${res.status}: ${body}`)
  }
  return res.json()
}

function isoDate(unixSec: number): string {
  const d = new Date(unixSec * 1000)
  return d.toISOString().slice(0, 10)
}

// ── POST /api/bank/connect ───────────────────────────────────────────────────

router.post('/connect', requireAuth, async (req: Request, res: Response) => {
  const { token } = req.body as { token?: string }
  if (!token?.trim()) {
    res.status(400).json({ error: 'Token required' }); return
  }

  let clientInfo: MonoClientInfo
  try {
    clientInfo = await monoFetch('/personal/client-info', token.trim()) as MonoClientInfo
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    res.status(400).json({ error: `Monobank error: ${msg}` }); return
  }

  // Pick first UAH account (currencyCode 980)
  const uahAccount = clientInfo.accounts.find(a => a.currencyCode === 980)
  if (!uahAccount) {
    res.status(400).json({ error: 'No UAH account found' }); return
  }

  const encryptedToken = encrypt(token.trim())

  const conn = await BankConnection.findOneAndUpdate(
    { userId: req.userId, bank: 'monobank' },
    {
      encryptedToken,
      accountId: uahAccount.id,
      accountName: clientInfo.name,
      enabled: true,
      lastSync: null,
    },
    { upsert: true, new: true },
  )

  res.json({
    bank: 'monobank',
    accountName: conn.accountName,
    accountId: conn.accountId,
    lastSync: conn.lastSync,
    enabled: conn.enabled,
  })
})

// ── GET /api/bank/status ─────────────────────────────────────────────────────

router.get('/status', requireAuth, async (req: Request, res: Response) => {
  const conn = await BankConnection.findOne({ userId: req.userId, bank: 'monobank' })
  if (!conn) { res.json(null); return }
  res.json({
    bank: 'monobank',
    accountName: conn.accountName,
    accountId: conn.accountId,
    lastSync: conn.lastSync,
    enabled: conn.enabled,
  })
})

// ── DELETE /api/bank/disconnect ──────────────────────────────────────────────

router.delete('/disconnect', requireAuth, async (req: Request, res: Response) => {
  await BankConnection.deleteOne({ userId: req.userId, bank: 'monobank' })
  res.json({ ok: true })
})

// ── POST /api/bank/sync ──────────────────────────────────────────────────────

router.post('/sync', requireAuth, async (req: Request, res: Response) => {
  const conn = await BankConnection.findOne({ userId: req.userId, bank: 'monobank', enabled: true })
  if (!conn) { res.status(404).json({ error: 'No connection' }); return }

  let token: string
  try {
    token = decrypt(conn.encryptedToken)
  } catch {
    res.status(500).json({ error: 'Token decryption failed' }); return
  }

  // Fetch last 30 days
  const to   = Math.floor(Date.now() / 1000)
  const from = to - 30 * 24 * 60 * 60

  let statements: MonoStatement[]
  try {
    statements = await monoFetch(
      `/personal/statement/${conn.accountId}/${from}/${to}`,
      token,
    ) as MonoStatement[]
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown'
    res.status(502).json({ error: msg }); return
  }

  // Deduplicate by monoId
  const existingMonoIds = new Set(
    (await Transaction.find({ userId: req.userId, monoId: { $ne: null } }).select('monoId'))
      .map(t => t.monoId as string),
  )

  const toInsert = statements
    .filter(s => s.currencyCode === 980 && s.amount !== 0 && !existingMonoIds.has(s.id))
    .map(s => ({
      userId:  req.userId,
      type:    s.amount < 0 ? 'expense' : 'income',
      amount:  Math.abs(s.amount) / 100,
      desc:    s.description || s.counterName || '',
      title:   '',
      category: '',
      date:    isoDate(s.time),
      monoId:  s.id,
      source:  'monobank' as const,
    }))

  if (toInsert.length > 0) {
    await Transaction.insertMany(toInsert)
  }

  conn.lastSync = new Date()
  await conn.save()

  res.json({ imported: toInsert.length, lastSync: conn.lastSync })
})

// ── POST /api/bank/import-csv ────────────────────────────────────────────────
// Monobank CSV format (semicolon separated), supports both old and new exports:
// Old: Дата і час;Деталі операції;MCC;Сума;Валюта операції;...
// New: Дата і час операції;Деталі операції;MCC;Категорія;Сума у валюті картки;...

router.post('/import-csv', requireAuth, async (req: Request, res: Response) => {
  const { csv } = req.body as { csv?: string }
  if (!csv?.trim()) { res.status(400).json({ error: 'CSV required' }); return }

  // Strip UTF-8 BOM if present
  const csvClean = csv.replace(/^﻿/, '').trim()
  const lines = csvClean.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) { res.status(400).json({ error: 'CSV too short' }); return }

  // Detect separator
  const header = lines[0]
  const sep = header.includes(';') ? ';' : ','

  function parseCsvLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === sep && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseCsvLine(header).map(h => h.toLowerCase().replace(/"/g, ''))

  // Find column indices — support both old and new Monobank export formats
  const dateIdx   = headers.findIndex(h => h.includes('дата'))
  const descIdx   = headers.findIndex(h => h.includes('деталі') || h.includes('опис'))
  // Old: "Сума" / "Сума (UAH)"; New: "Сума у валюті картки" / "Сума в валюті картки"
  const amountIdx = headers.findIndex(h =>
    h === 'сума' ||
    h.startsWith('сума (') ||
    h === 'сума у валюті картки' ||
    h === 'сума в валюті картки',
  )

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    const missing = [
      dateIdx === -1 && 'дата',
      descIdx === -1 && 'деталі операції',
      amountIdx === -1 && 'сума',
    ].filter(Boolean).join(', ')
    res.status(400).json({
      error: `Формат CSV не розпізнано (не знайдено: ${missing}). Очікується виписка Monobank.`,
    }); return
  }

  const toInsert: object[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    if (cols.length <= Math.max(dateIdx, descIdx, amountIdx)) continue

    const rawDate   = cols[dateIdx].replace(/"/g, '').trim()
    const rawDesc   = cols[descIdx].replace(/"/g, '').trim()
    const rawAmount = cols[amountIdx].replace(/"/g, '').replace(/\s/g, '').replace(',', '.').trim()

    // Parse date DD.MM.YYYY HH:MM:SS or DD.MM.YYYY
    const dateParts = rawDate.split(' ')[0].split('.')
    if (dateParts.length < 3) continue
    const isoDateStr = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`

    const amount = parseFloat(rawAmount)
    if (isNaN(amount) || amount === 0) continue

    toInsert.push({
      userId:   req.userId,
      type:     amount < 0 ? 'expense' : 'income',
      amount:   Math.abs(amount),
      desc:     rawDesc,
      title:    '',
      category: '',
      date:     isoDateStr,
      monoId:   null,
      source:   'csv' as const,
    })
  }

  if (toInsert.length > 0) {
    await Transaction.insertMany(toInsert)
  }

  res.json({ imported: toInsert.length })
})

export default router
