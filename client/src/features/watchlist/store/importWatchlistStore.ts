import { create } from 'zustand'

export type MimirField =
  | 'title'
  | 'status'
  | 'rating'
  | 'category'
  | 'year'
  | 'currentEpisode'
  | 'totalEpisodes'
  | 'currentSeason'
  | 'author'
  | 'isbn'
  | 'pageCount'

export const MIMIR_FIELD_LABELS: Record<MimirField, string> = {
  title:          'Назва',
  status:         'Статус',
  rating:         'Оцінка',
  category:       'Тип (фільм/серіал/книга)',
  year:           'Рік',
  currentEpisode: 'Поточний епізод',
  totalEpisodes:  'Всього епізодів',
  currentSeason:  'Поточний сезон',
  author:         'Автор',
  isbn:           'ISBN',
  pageCount:      'Кількість сторінок',
}

export const ALL_MIMIR_FIELDS: MimirField[] = [
  'title', 'status', 'rating', 'category', 'year',
  'currentEpisode', 'totalEpisodes', 'currentSeason',
  'author', 'isbn', 'pageCount',
]

export type ColumnMapping = Partial<Record<MimirField, string | null>>

export interface ParsedImportData {
  headers: string[]
  rows: Record<string, string>[]
  suggestedMapping: ColumnMapping
  totalRows: number
  aiParsed?: boolean
  truncated?: boolean
}

export interface ImportResult {
  imported: number
  skipped: number
  duplicates: number
  errors: string[]
  notFoundInTmdb: string[]
}

export type ImportStep = 'upload' | 'mapping' | 'preview' | 'confirming' | 'done'

interface ImportWatchlistState {
  step: ImportStep
  file: File | null
  parsedData: ParsedImportData | null
  columnMapping: ColumnMapping
  importResult: ImportResult | null
  isLoading: boolean
  error: string | null

  setStep: (step: ImportStep) => void
  setFile: (file: File) => void
  setParsedData: (data: ParsedImportData) => void
  setColumnMapping: (patch: ColumnMapping) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
  setImportResult: (r: ImportResult) => void
  reset: () => void
}

const DEFAULT_MAPPING: ColumnMapping = {
  title: null, status: null, rating: null, category: null,
  year: null, currentEpisode: null, totalEpisodes: null, currentSeason: null,
  author: null, isbn: null, pageCount: null,
}

export const useImportWatchlistStore = create<ImportWatchlistState>((set) => ({
  step: 'upload',
  file: null,
  parsedData: null,
  columnMapping: { ...DEFAULT_MAPPING },
  importResult: null,
  isLoading: false,
  error: null,

  setStep: (step) => set({ step }),
  setFile: (file) => set({ file }),
  setParsedData: (parsedData) => set({ parsedData }),
  setColumnMapping: (patch) => set(s => ({ columnMapping: { ...s.columnMapping, ...patch } })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setImportResult: (importResult) => set({ importResult }),
  reset: () => set({
    step: 'upload',
    file: null,
    parsedData: null,
    columnMapping: { ...DEFAULT_MAPPING },
    importResult: null,
    isLoading: false,
    error: null,
  }),
}))
