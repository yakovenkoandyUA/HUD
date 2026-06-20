import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { requireAuth } from '../middleware/auth'
import BankConnection from '../models/BankConnection'
import Transaction from '../models/Transaction'
import Category from '../models/Category'
import { categorize } from '../utils/categorizeTransaction'

const router = Router()

// tokenRequestId → userId (in-memory, TTL 5 min)
const pendingAuths = new Map<string, string>()

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

  const userCategories = await Category.find({ userId: req.userId, isActive: true })

  const toInsert = statements
    .filter(s => s.currencyCode === 980 && s.amount !== 0 && !existingMonoIds.has(s.id))
    .map(s => {
      const desc = s.description || s.counterName || ''
      const match = categorize(desc, userCategories, s.mcc || undefined)
      return {
        userId:     req.userId,
        type:       s.amount < 0 ? 'expense' : 'income',
        amount:     Math.abs(s.amount) / 100,
        desc,
        title:      '',
        category:   match?.name ?? '',
        categoryId: match?.id   ?? null,
        date:       isoDate(s.time),
        monoId:     s.id,
        mcc:        s.mcc || null,
        source:     'monobank' as const,
      }
    })

  if (toInsert.length > 0) {
    await Transaction.insertMany(toInsert)
  }

  conn.lastSync = new Date()
  await conn.save()

  res.json({ imported: toInsert.length, lastSync: conn.lastSync })
})

// ── POST /api/bank/mono-auth-init ───────────────────────────────────────────
// Step 1: initiate Monobank personal auth flow (no manual token needed)

router.post('/mono-auth-init', requireAuth, async (req: Request, res: Response) => {
  const webhookUrl = `${process.env.API_BASE_URL ?? 'https://hud-production.up.railway.app'}/api/bank/mono-auth-webhook`

  let tokenRequestId: string
  let acceptUrl: string
  try {
    const monoRes = await fetch(`${MONO_BASE}/personal/auth/request`, {
      headers: { 'X-Callback': webhookUrl },
    })
    if (!monoRes.ok) {
      const body = await monoRes.text()
      res.status(502).json({ error: `Monobank: ${body}` }); return
    }
    const data = await monoRes.json() as { tokenRequestId: string; acceptUrl: string }
    tokenRequestId = data.tokenRequestId
    acceptUrl = data.acceptUrl
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown'
    res.status(502).json({ error: msg }); return
  }

  pendingAuths.set(tokenRequestId, req.userId!)
  setTimeout(() => pendingAuths.delete(tokenRequestId), 5 * 60 * 1000)

  res.json({ tokenRequestId, acceptUrl })
})

// ── POST /api/bank/mono-auth-webhook ────────────────────────────────────────
// Step 2: Monobank calls this when user approves in their app

router.post('/mono-auth-webhook', async (req: Request, res: Response) => {
  const { tokenRequestId, token } = req.body as { tokenRequestId?: string; token?: string }
  if (!tokenRequestId || !token) { res.status(400).json({ error: 'Invalid payload' }); return }

  const userId = pendingAuths.get(tokenRequestId)
  if (!userId) { res.status(404).json({ error: 'Unknown tokenRequestId' }); return }

  let clientInfo: MonoClientInfo
  try {
    clientInfo = await monoFetch('/personal/client-info', token) as MonoClientInfo
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown'
    res.status(502).json({ error: msg }); return
  }

  const uahAccount = clientInfo.accounts.find(a => a.currencyCode === 980)
  if (!uahAccount) { res.status(400).json({ error: 'No UAH account found' }); return }

  await BankConnection.findOneAndUpdate(
    { userId, bank: 'monobank' },
    { encryptedToken: encrypt(token), accountId: uahAccount.id, accountName: clientInfo.name, enabled: true, lastSync: null },
    { upsert: true, new: true },
  )

  pendingAuths.delete(tokenRequestId)
  res.json({ ok: true })
})

// ── GET /api/bank/mono-auth-status/:tokenRequestId ──────────────────────────
// Frontend polls this to know when auth completed

router.get('/mono-auth-status/:tokenRequestId', requireAuth, async (req: Request, res: Response) => {
  const pending = pendingAuths.has(req.params.tokenRequestId)
  res.json({ pending })
})

// ── POST /api/bank/import-csv ────────────────────────────────────────────────
// Supports multiple Monobank CSV formats (semicolon-separated, Windows-1251 decoded on client):
//   Format A — app export:   Дата і час операції;Деталі операції;MCC;...;Сума у валюті картки;...
//   Format B — web statement: [metadata rows]; Дата і час;Статус;Тип;Деталі;Адреса;MCC;Сума списання;Сума зарахування

router.post('/import-csv', requireAuth, async (req: Request, res: Response) => {
  const { csv } = req.body as { csv?: string }
  if (!csv?.trim()) { res.status(400).json({ error: 'CSV required' }); return }

  // Strip UTF-8 BOM (U+FEFF) if present
  const csvClean = csv.replace(/^﻿/, '').trim()
  const allLines = csvClean.split('\n').map(l => l.trim()).filter(Boolean)
  if (allLines.length < 2) { res.status(400).json({ error: 'CSV too short' }); return }

  // Detect separator from first line
  const sep = allLines[0].includes(';') ? ';' : ','

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

  // Find the actual header row — skip metadata rows at the top.
  // Format B has 5 metadata rows before the real header.
  let headerLineIdx = -1
  for (let i = 0; i < Math.min(allLines.length, 10); i++) {
    const first = parseCsvLine(allLines[i])[0].toLowerCase().replace(/"/g, '')
    if (first.includes('дата')) { headerLineIdx = i; break }
  }
  if (headerLineIdx === -1) {
    res.status(400).json({ error: 'Формат CSV не розпізнано (рядок заголовка не знайдено). Очікується виписка Monobank.' })
    return
  }

  const headers = parseCsvLine(allLines[headerLineIdx]).map(h => h.toLowerCase().replace(/"/g, ''))
  const dataLines = allLines.slice(headerLineIdx + 1)

  const dateIdx = headers.findIndex(h => h.includes('дата'))
  const descIdx = headers.findIndex(h => h.includes('деталі') || h.includes('опис'))
  const mccIdx  = headers.findIndex(h => h === 'mcc')

  // Format A: single amount column
  const amountIdx = headers.findIndex(h =>
    h === 'сума' ||
    h.startsWith('сума (') ||
    h.startsWith('сума у валюті картки') ||
    h.startsWith('сума в валюті картки'),
  )
  // Format B: two separate columns. Monobank uses Latin 'C' instead of Cyrillic 'С' — handle both.
  const debitIdx  = headers.findIndex(h => h.includes('ума списання'))
  const creditIdx = headers.findIndex(h => h.includes('ума зарахування'))

  const hasNewFormat = debitIdx !== -1 && creditIdx !== -1

  if (dateIdx === -1 || descIdx === -1 || (!hasNewFormat && amountIdx === -1)) {
    const missing = [
      dateIdx === -1 && 'дата',
      descIdx === -1 && 'деталі',
      (!hasNewFormat && amountIdx === -1) && 'сума',
    ].filter(Boolean).join(', ')
    res.status(400).json({
      error: `Формат CSV не розпізнано (не знайдено: ${missing}). Очікується виписка Monobank.`,
    }); return
  }

  function parseAmount(raw: string): number {
    return parseFloat(raw.replace(/"/g, '').replace(/\s/g, '').replace(',', '.').trim())
  }

  const userCategories = await Category.find({ userId: req.userId, isActive: true })
  const toInsert: object[] = []

  for (const line of dataLines) {
    const cols = parseCsvLine(line)

    let amount: number
    if (hasNewFormat) {
      const debit  = parseAmount(cols[debitIdx]  ?? '')
      const credit = parseAmount(cols[creditIdx] ?? '')
      // One column will be NaN (empty), the other has the value
      if (!isNaN(debit)  && debit  !== 0) amount = debit   // already negative
      else if (!isNaN(credit) && credit !== 0) amount = credit  // positive
      else continue
    } else {
      if (cols.length <= amountIdx) continue
      amount = parseAmount(cols[amountIdx])
      if (isNaN(amount) || amount === 0) continue
    }

    if (cols.length <= Math.max(dateIdx, descIdx)) continue

    const rawDate = cols[dateIdx].replace(/"/g, '').trim()
    const rawDesc = cols[descIdx].replace(/"/g, '').trim()

    // Parse date: DD.MM.YYYY, DD.MM.YY, or DD.MM.YYYY HH:MM:SS
    const dateParts = rawDate.split(' ')[0].split('.')
    if (dateParts.length < 3) continue
    // Handle 2-digit year: "26" → "2026"
    const year = dateParts[2].length === 2 ? `20${dateParts[2]}` : dateParts[2]
    const isoDateStr = `${year}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`
    if (isNaN(new Date(isoDateStr).getTime())) continue

    const rawMcc = mccIdx !== -1 ? parseInt(cols[mccIdx]?.replace(/"/g, '').trim(), 10) : NaN
    const mcc = isNaN(rawMcc) ? undefined : rawMcc

    const match = categorize(rawDesc, userCategories, mcc)

    toInsert.push({
      userId:     req.userId,
      type:       amount < 0 ? 'expense' : 'income',
      amount:     Math.abs(amount),
      desc:       rawDesc,
      title:      '',
      category:   match?.name ?? '',
      categoryId: match?.id   ?? null,
      date:       isoDateStr,
      monoId:     null,
      mcc:        mcc ?? null,
      source:     'csv' as const,
    })
  }

  if (toInsert.length > 0) {
    await Transaction.insertMany(toInsert)
  }

  res.json({ imported: toInsert.length })
})

// ── POST /api/bank/recategorize ─────────────────────────────────────────────
// Retroactively categorizes all bank/csv transactions with empty category.

router.post('/recategorize', requireAuth, async (req: Request, res: Response) => {
  const uncategorized = await Transaction.find({
    userId: req.userId,
    source: { $in: ['monobank', 'csv'] },
    $or: [{ category: '' }, { category: { $exists: false } }, { categoryId: null }],
  })

  if (uncategorized.length === 0) {
    res.json({ updated: 0, skipped: 0 }); return
  }

  const userCategories = await Category.find({ userId: req.userId, isActive: true })

  let updated = 0
  let skipped = 0

  for (const tx of uncategorized) {
    const match = categorize(tx.desc ?? '', userCategories, tx.mcc ?? undefined)
    if (!match) { skipped++; continue }
    tx.category   = match.name
    tx.categoryId = match.id
    await tx.save()
    updated++
  }

  res.json({ updated, skipped })
})

export default router
