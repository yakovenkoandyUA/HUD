import { Request, Response } from 'express'
import * as XLSX from 'xlsx'
import { mapStatus } from '../utils/statusMappingDictionary'
import WatchlistItem from '../models/WatchlistItem'

// ── Types ────────────────────────────────────────────────────────────────────

type MimirField =
  | 'title'
  | 'status'
  | 'rating'
  | 'category'
  | 'year'
  | 'currentEpisode'
  | 'totalEpisodes'
  | 'currentSeason'

type ColumnMapping = Partial<Record<MimirField, string>>

interface ParsedImportData {
  headers: string[]
  rows: Record<string, string>[]
  suggestedMapping: ColumnMapping
  totalRows: number
  truncated?: boolean
}

interface ConfirmRow {
  title: string
  status?: string
  rating?: string
  category?: string
  year?: string
  currentEpisode?: string
  totalEpisodes?: string
  currentSeason?: string
}

// ── Auto-mapping keywords ─────────────────────────────────────────────────────

const FIELD_KEYWORDS: Record<MimirField, string[]> = {
  title:          ['назва', 'название', 'title', 'name', 'film', 'movie', 'серіал', 'сериал'],
  status:         ['статус', 'status', 'state', 'стан'],
  rating:         ['оцінка', 'оценка', 'rating', 'score', 'рейтинг', 'rate', 'оцін'],
  category:       ['category', 'тип', 'type', 'категорія', 'категория', 'kind'],
  year:           ['рік', 'год', 'year', 'дата', 'date', 'release'],
  currentEpisode: ['просмотрено эпизодов', 'переглянуто серій', 'episode', 'серія', 'ep',
                   'эпизод', 'watched ep', 'серии', 'переглянуто'],
  totalEpisodes:  ['всього серій', 'total episodes', 'episodes total', 'всего эпизодов',
                   'total ep', 'episodes count'],
  currentSeason:  ['season', 'сезон', 'se'],
}

function suggestMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  const usedHeaders = new Set<string>()

  for (const [field, keywords] of Object.entries(FIELD_KEYWORDS) as [MimirField, string[]][]) {
    for (const header of headers) {
      if (usedHeaders.has(header)) continue
      const lh = header.toLowerCase()
      if (keywords.some(kw => lh.includes(kw) || kw.includes(lh))) {
        mapping[field] = header
        usedHeaders.add(header)
        break
      }
    }
  }

  return mapping
}

// ── CSV parser (handles BOM, semicolon and comma delimiters) ─────────────────

function parseCsvText(text: string): Record<string, string>[] {
  const clean = text.replace(/^﻿/, '')
  const lines = clean.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const firstLine = lines[0]
  const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ','

  const parseRow = (line: string): string[] => {
    const fields: string[] = []
    let field = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (inQuotes) {
        if (c === '"' && line[i + 1] === '"') { field += '"'; i++ }
        else if (c === '"') inQuotes = false
        else field += c
      } else if (c === '"') {
        inQuotes = true
      } else if (c === delimiter) {
        fields.push(field); field = ''
      } else {
        field += c
      }
    }
    fields.push(field)
    return fields
  }

  const headers = parseRow(lines[0]).map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = parseRow(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = (values[i] ?? '').trim() })
    return obj
  }).filter(row => Object.values(row).some(v => v !== ''))
}

// ── XLSX parser ───────────────────────────────────────────────────────────────

function parseXlsxBuffer(buffer: Buffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  return raw.map(row =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [String(k).trim(), String(v ?? '').trim()])
    )
  )
}

// ── TMDB search ───────────────────────────────────────────────────────────────

interface TmdbResult {
  id: number
  title?: string
  name?: string
  original_title?: string
  original_name?: string
  poster_path: string | null
  backdrop_path: string | null
  overview: string
  release_date?: string
  first_air_date?: string
  genre_ids?: number[]
  media_type?: string
  number_of_seasons?: number
  number_of_episodes?: number
}

async function searchTmdb(
  title: string,
  year: string,
  category: string,
): Promise<TmdbResult | null> {
  const key = process.env.TMDB_API_KEY
  if (!key) return null

  const endpoint = category === 'series' || category === 'anime'
    ? 'https://api.themoviedb.org/3/search/tv'
    : 'https://api.themoviedb.org/3/search/movie'

  const qs = new URLSearchParams({ api_key: key, query: title, language: 'uk', page: '1' })
  if (year) qs.set(category === 'series' || category === 'anime' ? 'first_air_date_year' : 'year', year)

  try {
    const res = await fetch(`${endpoint}?${qs}`)
    if (!res.ok) return null
    const data = await res.json() as { results?: TmdbResult[] }
    return data.results?.[0] ?? null
  } catch {
    return null
  }
}

// ── Parse file endpoint ───────────────────────────────────────────────────────

export async function parseImportFile(req: Request, res: Response): Promise<void> {
  const file = req.file
  if (!file) { res.status(400).json({ error: 'Файл не передано' }); return }

  const name = file.originalname.toLowerCase()
  let allRows: Record<string, string>[] = []

  if (name.endsWith('.csv') || file.mimetype === 'text/csv') {
    const text = file.buffer.toString('utf-8')
    allRows = parseCsvText(text)
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    allRows = parseXlsxBuffer(file.buffer)
  } else {
    res.status(400).json({ error: 'Непідтримуваний формат. Підтримуються CSV та XLSX.' })
    return
  }

  if (allRows.length === 0) {
    res.status(422).json({ error: 'Файл порожній або не містить розпізнаних даних.' })
    return
  }

  const headers = Object.keys(allRows[0])
  const suggestedMapping = suggestMapping(headers)
  const MAX_ROWS = 1000

  const response: ParsedImportData = {
    headers,
    rows: allRows.slice(0, MAX_ROWS),
    suggestedMapping,
    totalRows: allRows.length,
    truncated: allRows.length > MAX_ROWS,
  }

  res.json(response)
}

// ── Confirm import endpoint ───────────────────────────────────────────────────

export async function confirmImport(req: Request, res: Response): Promise<void> {
  const userId = req.userId
  interface ConfirmBody {
    rows: Record<string, string>[]
    mapping: ColumnMapping
  }
  const { rows, mapping } = req.body as ConfirmBody

  if (!Array.isArray(rows) || !mapping) {
    res.status(400).json({ error: 'Некоректні дані' })
    return
  }

  // Map CSV rows to structured objects
  const mapped: ConfirmRow[] = rows
    .filter(row => {
      const titleCol = mapping.title
      return titleCol ? (row[titleCol] ?? '').trim() !== '' : false
    })
    .map(row => ({
      title:          mapping.title          ? (row[mapping.title]          ?? '').trim() : '',
      status:         mapping.status         ? (row[mapping.status]         ?? '').trim() : undefined,
      rating:         mapping.rating         ? (row[mapping.rating]         ?? '').trim() : undefined,
      category:       mapping.category       ? (row[mapping.category]       ?? '').trim() : undefined,
      year:           mapping.year           ? (row[mapping.year]           ?? '').trim() : undefined,
      currentEpisode: mapping.currentEpisode ? (row[mapping.currentEpisode] ?? '').trim() : undefined,
      totalEpisodes:  mapping.totalEpisodes  ? (row[mapping.totalEpisodes]  ?? '').trim() : undefined,
      currentSeason:  mapping.currentSeason  ? (row[mapping.currentSeason]  ?? '').trim() : undefined,
    }))

  // Fetch existing tmdbIds to detect duplicates
  const existingItems = await WatchlistItem.find({ userId }, { tmdbId: 1, title: 1 }).lean()
  const existingTmdbIds = new Set(existingItems.map(i => i.tmdbId).filter(id => id > 0))
  const existingTitles  = new Set(existingItems.map(i => i.title.toLowerCase()))

  let imported = 0
  let skipped  = 0
  let duplicates = 0
  const errors: string[] = []
  const notFoundInTmdb: string[] = []

  // TMDB lookup in parallel batches of 20
  const BATCH = 20
  const toInsert: Parameters<typeof WatchlistItem.create>[0][] = []

  for (let i = 0; i < mapped.length; i += BATCH) {
    const batch = mapped.slice(i, i + BATCH)

    await Promise.all(batch.map(async row => {
      if (!row.title) { skipped++; return }

      const rawCategory = (row.category ?? '').toLowerCase()
      let category: 'movie' | 'series' | 'anime' = 'movie'
      if (rawCategory.includes('series') || rawCategory.includes('серіал') || rawCategory.includes('сериал')) {
        category = 'series'
      } else if (rawCategory.includes('anime') || rawCategory.includes('аніме') || rawCategory.includes('аниме')) {
        category = 'anime'
      }

      const internalStatus = row.status ? (mapStatus(row.status) ?? 'watched') : 'watched'

      const rawRating = parseFloat(row.rating ?? '')
      let rating: number | null = null
      if (!Number.isNaN(rawRating) && rawRating > 0) {
        // Normalize: if 0–10 scale, keep; if 0–5 → ×2; if 0–100 → /10
        if (rawRating > 10) rating = Math.round(rawRating / 10)
        else if (rawRating <= 5 && rawRating > 0) rating = Math.round(rawRating * 2)
        else rating = Math.round(rawRating)
        rating = Math.min(10, Math.max(1, rating))
      }

      const tmdbResult = await searchTmdb(row.title, row.year ?? '', category)

      // addedAt: use year from file or TMDB release date for chronological ordering
      const addedAt = (() => {
        const rawYear = row.year?.trim()
        if (rawYear && /^\d{4}$/.test(rawYear)) {
          const y = parseInt(rawYear, 10)
          if (y >= 1900 && y <= new Date().getFullYear()) {
            return new Date(y, 6, 1).toISOString() // July 1 of that year
          }
        }
        return new Date().toISOString()
      })()

      if (tmdbResult) {
        if (existingTmdbIds.has(tmdbResult.id)) { duplicates++; return }
        existingTmdbIds.add(tmdbResult.id)

        const tmdbYear = (tmdbResult.release_date ?? tmdbResult.first_air_date ?? '').slice(0, 4)
        const resolvedAddedAt = addedAt !== new Date().toISOString() ? addedAt : (() => {
          if (tmdbYear && /^\d{4}$/.test(tmdbYear)) {
            return new Date(parseInt(tmdbYear, 10), 6, 1).toISOString()
          }
          return addedAt
        })()

        toInsert.push({
          tmdbId:        tmdbResult.id,
          title:         tmdbResult.title ?? tmdbResult.name ?? row.title,
          originalTitle: tmdbResult.original_title ?? tmdbResult.original_name ?? '',
          category,
          status:        internalStatus,
          posterPath:    tmdbResult.poster_path ?? '',
          backdropPath:  tmdbResult.backdrop_path ?? '',
          overview:      tmdbResult.overview ?? '',
          year:          tmdbYear,
          genres:        [],
          rating,
          currentEpisode: row.currentEpisode ? (parseInt(row.currentEpisode, 10) || null) : null,
          totalEpisodes:  row.totalEpisodes  ? (parseInt(row.totalEpisodes,  10) || null) : null,
          currentSeason:  row.currentSeason  ? (parseInt(row.currentSeason,  10) || null) : null,
          addedAt:       resolvedAddedAt,
          userId,
        })
      } else {
        // No TMDB match — insert as manual entry
        const titleLower = row.title.toLowerCase()
        if (existingTitles.has(titleLower)) { duplicates++; return }
        existingTitles.add(titleLower)
        notFoundInTmdb.push(row.title)

        toInsert.push({
          tmdbId:        0,
          title:         row.title,
          originalTitle: '',
          category,
          status:        internalStatus,
          posterPath:    '',
          backdropPath:  '',
          overview:      '',
          year:          row.year ?? '',
          genres:        [],
          rating,
          currentEpisode: row.currentEpisode ? (parseInt(row.currentEpisode, 10) || null) : null,
          totalEpisodes:  row.totalEpisodes  ? (parseInt(row.totalEpisodes,  10) || null) : null,
          currentSeason:  row.currentSeason  ? (parseInt(row.currentSeason,  10) || null) : null,
          addedAt,
          userId,
        })
      }
    }))
  }

  try {
    if (toInsert.length > 0) {
      await WatchlistItem.insertMany(toInsert, { ordered: false })
      imported = toInsert.length
    }
  } catch (err: unknown) {
    // insertMany with ordered:false continues past individual errors
    const bulkErr = err as { insertedDocs?: unknown[]; writeErrors?: unknown[] }
    imported = bulkErr.insertedDocs?.length ?? toInsert.length
    const writeErrors = bulkErr.writeErrors ?? []
    if (Array.isArray(writeErrors) && writeErrors.length > 0) {
      errors.push(`${writeErrors.length} записів не вдалося зберегти`)
    }
  }

  res.json({ imported, skipped, duplicates, errors, notFoundInTmdb })
}

// ── AI parse endpoint (images and PDF text) ───────────────────────────────────

export async function parseImportFileAI(req: Request, res: Response): Promise<void> {
  const file = req.file
  if (!file) { res.status(400).json({ error: 'Файл не передано' }); return }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) { res.status(503).json({ error: 'AI-розпізнавання недоступне' }); return }

  const name = file.originalname.toLowerCase()
  const isImage = /\.(png|jpg|jpeg|webp|gif)$/.test(name) || file.mimetype.startsWith('image/')
  const isPdf   = name.endsWith('.pdf') || file.mimetype === 'application/pdf'

  if (!isImage && !isPdf) {
    res.status(400).json({ error: 'AI-розпізнавання підтримує лише зображення та PDF.' })
    return
  }

  let content: { type: string; [k: string]: unknown }[]

  if (isImage) {
    const base64 = file.buffer.toString('base64')
    const mediaType = (file.mimetype || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
    content = [
      {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 },
      },
      {
        type: 'text',
        text: `Це скріншот або фото зі списком переглянутих серіалів/фільмів.
Розпізнай всі записи і поверни СТРОГО JSON-масив, нічого більше:
[{ "title": "...", "status": "want|watching|watched|dropped", "rating": число або null, "year": "рік або пустий рядок", "category": "movie|series|anime" }]
Статуси: want=хочу дивитись, watching=дивлюся, watched=переглянув, dropped=кинув.`,
      },
    ]
  } else {
    // PDF — extract text via pdf-parse
    let pdfText = ''
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
      const parsed = await pdfParse(file.buffer)
      pdfText = parsed.text.slice(0, 12000)
    } catch {
      res.status(422).json({ error: 'Не вдалося витягнути текст з PDF. Спробуйте експортувати в CSV.' })
      return
    }

    content = [
      {
        type: 'text',
        text: `Ось текст з PDF-файлу зі списком переглянутих серіалів/фільмів:

${pdfText}

Розпізнай всі записи і поверни СТРОГО JSON-масив, нічого більше:
[{ "title": "...", "status": "want|watching|watched|dropped", "rating": число або null, "year": "рік або пустий рядок", "category": "movie|series|anime" }]
Статуси: want=хочу дивитись, watching=дивлюся, watched=переглянув, dropped=кинув.`,
      },
    ]
  }

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content }],
      }),
    })

    if (!aiRes.ok) {
      res.status(502).json({ error: 'AI-сервіс тимчасово недоступний' })
      return
    }

    const aiData = await aiRes.json() as { content?: { type: string; text?: string }[] }
    const rawText = aiData.content?.find(c => c.type === 'text')?.text ?? ''

    const jsonMatch = rawText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      res.status(422).json({ error: 'AI не зміг розпізнати список. Спробуйте CSV-файл.' })
      return
    }

    interface AiRow {
      title?: string
      status?: string
      rating?: number | null
      year?: string
      category?: string
    }
    const aiRows = JSON.parse(jsonMatch[0]) as AiRow[]

    const rows: Record<string, string>[] = aiRows.map(r => ({
      title:    String(r.title    ?? ''),
      status:   String(r.status   ?? ''),
      rating:   r.rating != null ? String(r.rating) : '',
      year:     String(r.year     ?? ''),
      category: String(r.category ?? ''),
    }))

    const headers = ['title', 'status', 'rating', 'year', 'category']
    const suggestedMapping: ColumnMapping = {
      title:    'title',
      status:   'status',
      rating:   'rating',
      year:     'year',
      category: 'category',
    }

    res.json({
      headers,
      rows: rows.slice(0, 50),
      suggestedMapping,
      totalRows:  rows.length,
      aiParsed:   true,
    })
  } catch {
    res.status(502).json({ error: 'Помилка AI-розпізнавання. Спробуйте CSV-файл.' })
  }
}
