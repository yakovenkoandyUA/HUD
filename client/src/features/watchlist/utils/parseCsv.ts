/**
 * parseCsv
 * --------
 * Мінімальний RFC4180-парсер CSV (підтримує квоти, екрановані `""`,
 * коми та переноси рядків усередині полів — потрібно для Letterboxd/Goodreads
 * експортів, де назви фільмів/рецензії можуть містити кому чи `\n`).
 *
 * @returns масив об'єктів, ключі — заголовки першого рядка
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text)
  if (rows.length === 0) return []
  const header = rows[0].map(h => h.trim())
  return rows.slice(1).map(row => {
    const obj: Record<string, string> = {}
    header.forEach((h, i) => { obj[h] = row[i] ?? '' })
    return obj
  })
}

function parseCsvRows(text: string): string[][] {
  const clean = text.replace(/^﻿/, '') // strip BOM
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field); field = ''
    } else if (c === '\r') {
      // skip — \n handles the line break
    } else if (c === '\n') {
      row.push(field); field = ''
      rows.push(row); row = []
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }

  return rows.filter(r => r.some(c => c.trim() !== ''))
}
