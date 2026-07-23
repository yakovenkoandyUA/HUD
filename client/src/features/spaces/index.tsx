import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppHeader from '@/shared/components/layout/AppHeader'
import { useSpacesStore, type Space, type SpaceType } from '@/features/memories/store/spacesStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { authFetch } from '@/shared/services/api'
import MemoryCard from '@/features/memories/components/memories/MemoryCard'
import PlanCard from '@/features/memories/components/memories/PlanCard'
import AddMemoryModal from '@/features/memories/components/memories/AddMemoryModal'
import PlanForm from '@/features/memories/components/memories/PlanForm'
import { useMemoriesStore } from '@/features/memories/store/memoriesStore'
import { usePlansStore, type Plan } from '@/features/memories/store/plansStore'
import { useNotesStore, type Note } from '@/features/notes/notesStore'
import type { Memory } from '@/features/memories/types/memory'
import type { AddMemoryData } from '@/features/memories/components/memories/AddMemoryModal'
import type { PlanInput } from '@/features/memories/store/plansStore'
import ImageUploadButton from '@/shared/components/ui/ImageUploadButton'
import ProgressBar from '@/shared/components/ui/ProgressBar'
import VehicleSpaceView from './components/VehicleSpaceView'
import PetSpaceView from './components/PetSpaceView'
import PlantSpaceView from './components/PlantSpaceView'
import TripSpaceView from './components/TripSpaceView'
import AddTicketSheet from './components/AddTicketSheet'
import AddAccommodationSheet from './components/AddAccommodationSheet'
import AddPlaceSheet from './components/AddPlaceSheet'
import AddSpaceExpenseSheet from './components/AddSpaceExpenseSheet'
import SpaceChatSheet from './components/SpaceChatSheet'
import SpaceTaskItem from './components/SpaceTaskItem'
import MimirIcon from '@/shared/components/ui/MimirIcon'
import { SPACE_TYPE_CONFIG } from './data/spaceTypes'
import styles from './SpaceDetail.module.css'

// ── Constants ──────────────────────────────────────────────────────────────


// '' = default (uses theme accent)
const COLORS = [
  '', '#7c3aed', '#2563eb', '#0ea5e9', '#059669',
  '#d97706', '#f97316', '#e11d48', '#db2777', '#475569',
]

// ── Context config ─────────────────────────────────────────────────────────

interface SpaceCtx {
  typeLabel:       string
  description:     string
  memBtnLabel:     string
  planBtnLabel:    string
  noteBtnLabel:    string
  taskBtnLabel:    string
  txEmptyTitle:    string
  txEmptyDesc:     string
  memEmptyTitle:   string
  memEmptyDesc:    string
  planEmptyTitle:  string
  planEmptyDesc:   string
  noteEmptyTitle:  string
  noteEmptyDesc:   string
  taskEmptyTitle:  string
  taskEmptyDesc:   string
}

import type { SpaceTask } from './types'

interface SpaceTx {
  _id: string
  type: 'income' | 'expense'
  amount: number
  desc: string
  title?: string
  category?: string
  date: string
}

const SPACE_CONTEXT: Record<string, SpaceCtx> = {
  shared: {
    typeLabel: 'Спільне', description: 'Спільний простір для людей, речей і планів що вас об\'єднують.',
    memBtnLabel: '+ Спільний спогад', planBtnLabel: '+ Спільний план', noteBtnLabel: '+ Нотатка', taskBtnLabel: '+ Задача',
    txEmptyTitle: 'Транзакцій ще немає',  txEmptyDesc: 'Спільні витрати в цьому просторі з\'являться тут.',
    memEmptyTitle: 'Спогадів ще немає',   memEmptyDesc: 'Додай перший спільний момент.',
    planEmptyTitle: 'Планів ще немає',    planEmptyDesc: 'Запиши першу спільну ідею або план.',
    noteEmptyTitle: 'Нотаток ще немає',   noteEmptyDesc: 'Залишай короткі записи для спільного контексту.',
    taskEmptyTitle: 'Задач ще немає',     taskEmptyDesc: 'Додай спільне завдання або чекліст.',
  },
  trip: {
    typeLabel: 'Поїздка', description: 'Збирай тут плани, спогади, місця й враження цієї поїздки — до, під час і після.',
    memBtnLabel: '+ Момент поїздки', planBtnLabel: '+ Ідея маршруту', noteBtnLabel: '+ Нотатка', taskBtnLabel: '+ Що зробити',
    txEmptyTitle: 'Витрат ще немає',      txEmptyDesc: 'Додай витрати поїздки — готель, транспорт, розваги.',
    memEmptyTitle: 'Спогадів ще немає',   memEmptyDesc: 'Додай перший момент з цієї поїздки: фото, коротку історію або місце.',
    planEmptyTitle: 'Планів ще немає',    planEmptyDesc: 'Запиши маршрут, ідею, бронювання або щось що хочеш не забути.',
    noteEmptyTitle: 'Нотаток ще немає',   noteEmptyDesc: 'Адреси, рекомендації, що подивитись, де поїсти — все тут.',
    taskEmptyTitle: 'Чекліст порожній',   taskEmptyDesc: 'Купити квитки, забронювати готель, що взяти — записуй тут.',
  },
  sports: {
    typeLabel: 'Спорт', description: 'Тренування, змагання, результати — всі спортивні моменти тут.',
    memBtnLabel: '+ Результат', planBtnLabel: '+ Тренування', noteBtnLabel: '+ Нотатка', taskBtnLabel: '+ Тренування',
    txEmptyTitle: 'Витрат ще немає',      txEmptyDesc: 'Абонемент, форма, змагання — фіксуй спортивні витрати.',
    memEmptyTitle: 'Результатів ще немає', memEmptyDesc: 'Додай перше тренування, змагання або досягнення.',
    planEmptyTitle: 'Тренувань ще немає', planEmptyDesc: 'Заплануй наступне тренування або постав спортивну ціль.',
    noteEmptyTitle: 'Нотаток ще немає',   noteEmptyDesc: 'Програми, техніки, PR-и — записуй що важливо.',
    taskEmptyTitle: 'Тренувань ще немає', taskEmptyDesc: 'Додай наступне тренування або спортивну задачу.',
  },
  vehicle: {
    typeLabel: 'Авто', description: 'Хроніка автомобіля — заправки, ТО, документи й витрати в одному місці.',
    memBtnLabel: '+ Подія', planBtnLabel: '+ Нотатка', noteBtnLabel: '+ Нотатка', taskBtnLabel: '+ Задача',
    txEmptyTitle: 'Витрат ще немає',    txEmptyDesc: 'Витрати на пальне, ТО і ремонти з\'являться тут.',
    memEmptyTitle: 'Подій ще немає',    memEmptyDesc: 'Додай першу подію — заправку або ТО.',
    planEmptyTitle: 'Нотаток ще немає', planEmptyDesc: 'Записуй важливі думки про автомобіль.',
    noteEmptyTitle: 'Нотаток ще немає', noteEmptyDesc: 'Записуй важливі думки про автомобіль.',
    taskEmptyTitle: 'Задач ще немає',   taskEmptyDesc: 'Що потрібно зробити з автомобілем.',
  },
}

const DEFAULT_CTX: SpaceCtx = {
  typeLabel: '', description: '',
  memBtnLabel: '+ Спогад', planBtnLabel: '+ План', noteBtnLabel: '+ Нотатка', taskBtnLabel: '+ Задача',
  txEmptyTitle: 'Транзакцій ще немає', txEmptyDesc: 'Витрати пов\'язані з цим простором з\'являться тут.',
  memEmptyTitle: 'Спогадів ще немає',  memEmptyDesc: 'Додай перший спогад у цей простір.',
  planEmptyTitle: 'Планів ще немає',   planEmptyDesc: 'Запиши перший план або ціль.',
  noteEmptyTitle: 'Нотаток ще немає',  noteEmptyDesc: 'Залишай короткі записи в цьому просторі.',
  taskEmptyTitle: 'Задач ще немає',    taskEmptyDesc: 'Додай першу задачу в цей простір.',
}


function formatTxAmount(amount: number): string {
  return amount.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function getCurrentWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

const _today    = new Date()
const _todayStr  = _today.toISOString().slice(0, 10)
const _yest      = new Date(_today); _yest.setDate(_yest.getDate() - 1)
const _yesterStr = _yest.toISOString().slice(0, 10)

function formatTxDateHeader(iso: string): string {
  if (iso === _todayStr)  return 'Сьогодні'
  if (iso === _yesterStr) return 'Вчора'
  const d = new Date(iso + 'T00:00:00')
  const sameYear = d.getFullYear() === _today.getFullYear()
  return d.toLocaleDateString('uk-UA', {
    day: 'numeric', month: 'long',
    ...(!sameYear && { year: 'numeric' }),
  })
}



function formatNoteDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString())
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * SpaceDetailScreen
 * -----------------
 * Повний екран простору: hero (з кнопкою редагування для owner),
 * overview, учасники (з управлінням), спогади, плани, нотатки.
 * Редагування і видалення — bottom sheet зі swipe-to-dismiss.
 */
const SpaceDetailScreen: React.FC = () => {
  const navigate = useNavigate()
  const { spaceId } = useParams<{ spaceId: string }>()
  const { spaces, fetchSpaces, updateSpace, deleteSpace, archiveSpace, addMember, removeMember, setPetProfile, setTripProfile, setPlantProfile } = useSpacesStore()
  const myId = useProfileStore(s => s.activeProfile?.id ?? '')
  const { showToast } = useUiStore()
  const { addMemory }  = useMemoriesStore()
  const { addPlan }    = usePlansStore()
  const { addNote, deleteNote } = useNotesStore()

  // ── Content state ──
  // null = still loading; [] = loaded and empty
  const [space, setSpace]             = useState<Space | null>(null)
  const [memories, setMemories]       = useState<Memory[]   | null>(null)
  const [plans, setPlans]             = useState<Plan[]     | null>(null)
  const [spaceNotes, setSpaceNotes]   = useState<Note[]     | null>(null)
  const [spaceTasks, setSpaceTasks]   = useState<SpaceTask[]| null>(null)
  const [spaceTxs, setSpaceTxs]       = useState<SpaceTx[] | null>(null)
  const [loading, setLoading]         = useState(true)

  // ── Modals / Inputs ──
  const [addMemOpen, setAddMemOpen]             = useState(false)
  const [addPlanOpen, setAddPlanOpen]           = useState(false)
  const [addTicketOpen, setAddTicketOpen]       = useState(false)
  const [addAccomOpen, setAddAccomOpen]         = useState(false)
  const [addTripPlaceOpen, setAddTripPlaceOpen] = useState(false)
  const [addExpenseOpen, setAddExpenseOpen]     = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText]           = useState('')
  const [showTaskInput, setShowTaskInput] = useState(false)
  const [taskInputText, setTaskInputText] = useState('')
  const [savingTask, setSavingTask]       = useState(false)

  // ── Edit sheet ──
  const [chatOpen, setChatOpen]     = useState(false)
  const [editOpen, setEditOpen]     = useState(false)
  const [editName, setEditName]       = useState('')
  const [editEmoji, setEditEmoji]     = useState('')
  const [editColor, setEditColor]     = useState(COLORS[0])
  const [editType, setEditType]       = useState<SpaceType>('shared')
  const [editCoverUrl, setEditCoverUrl]             = useState('')
  const [editCoverPosition, setEditCoverPosition]   = useState('center')
  const [editBudget, setEditBudget]                 = useState('')
  const [editBudgetCurrency, setEditBudgetCurrency] = useState('UAH')
  const [editModules, setEditModules] = useState<string[]>([])
  const [editSaving, setEditSaving]               = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // ── Unsplash auto-hero for trip spaces ──
  const [unsplashPhotos, setUnsplashPhotos]   = useState<Array<{ url: string; attribution: string }>>([])
  const [unsplashIndex, setUnsplashIndex]     = useState(0)
  const unsplashHeroUrl    = unsplashPhotos[unsplashIndex]?.url    ?? null
  const unsplashAttribution = unsplashPhotos[unsplashIndex]?.attribution ?? null

  // ── Budget suggest ──
  const [budgetSuggestDismissed, setBudgetSuggestDismissed] = useState(
    () => !!localStorage.getItem(`budget-suggest-dismissed-${spaceId}`)
  )

  // ── Members ──
  const [memberInput, setMemberInput]   = useState('')
  const [addingMember, setAddingMember] = useState(false)

  // ── Refs ──
  const taskInputRef     = useRef<HTMLInputElement>(null)
  const tasksSectionRef  = useRef<HTMLElement>(null)
  const noteTextareaRef  = useRef<HTMLTextAreaElement>(null)
  const notesSectionRef  = useRef<HTMLElement>(null)
  const editOverlayRef   = useRef<HTMLDivElement>(null)
  const editSheetRef     = useSwipeToDismiss(() => setEditOpen(false), { enabled: editOpen, overlayRef: editOverlayRef })

  // ── Initial load ──
  useEffect(() => {
    if (!spaceId) return
    let cancelled = false
    const load = async () => {
      let found = spaces.find(s => s.id === spaceId) ?? null
      if (!found) {
        await fetchSpaces()
        found = useSpacesStore.getState().spaces.find(s => s.id === spaceId) ?? null
      }
      if (!cancelled) setSpace(found)

      const spaceType  = found?.type
      const needsFull  = spaceType !== 'vehicle' && spaceType !== 'pet' && spaceType !== 'plant'
      const needsTasks = spaceType !== 'vehicle'

      // Typed spaces skip sections they never show — resolve immediately with empty
      if (!needsFull)  { setMemories([]); setPlans([]); setSpaceNotes([]) }
      if (!needsTasks) { setSpaceTasks([]) }

      // Fire all needed requests in parallel; each section updates as its response arrives
      const fetches: Promise<void>[] = []

      if (needsFull) {
        fetches.push(
          authFetch(`/api/memories?spaceId=${spaceId}`)
            .then(async r => { if (!cancelled && r.ok) setMemories(await parseMemories(r)) }),
          authFetch(`/api/plans?spaceId=${spaceId}`)
            .then(async r => { if (!cancelled && r.ok) setPlans(await r.json() as Plan[]) }),
          authFetch(`/api/notes?spaceId=${spaceId}`)
            .then(async r => { if (!cancelled && r.ok) setSpaceNotes(await r.json() as Note[]) }),
        )
      }
      if (needsTasks) {
        fetches.push(
          authFetch(`/api/sprint/tasks?spaceId=${spaceId}`)
            .then(async r => { if (!cancelled && r.ok) setSpaceTasks(await r.json() as SpaceTask[]) }),
        )
      }
      fetches.push(
        authFetch(`/api/transactions?spaceId=${spaceId}`)
          .then(async r => { if (!cancelled && r.ok) setSpaceTxs(await r.json() as SpaceTx[]) }),
      )

      await Promise.all(fetches)
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId])

  // Sync space from store after any store update (updateSpace, addMember etc.)
  useEffect(() => {
    if (!spaceId) return
    const updated = spaces.find(s => s.id === spaceId)
    if (updated) setSpace(updated)
  }, [spaces, spaceId])

  // Unsplash auto-hero: fetch when trip space has destination but no custom cover
  useEffect(() => {
    if (space?.type !== 'trip') return
    if (space.coverUrl) { setUnsplashPhotos([]); setUnsplashIndex(0); return }
    const destination = space.tripProfile?.destination
    if (!destination) return
    let cancelled = false
    const load = async () => {
      try {
        const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY as string
        const CITY_EN: Record<string, string> = {
          'париж':'Paris','лондон':'London','рим':'Rome','берлін':'Berlin','відень':'Vienna',
          'барселона':'Barcelona','прага':'Prague','амстердам':'Amsterdam','токіо':'Tokyo',
          'нью-йорк':'New York','дубай':'Dubai','стамбул':'Istanbul','бангкок':'Bangkok',
          'лісабон':'Lisbon','будапешт':'Budapest','варшава':'Warsaw','краків':'Krakow',
          'мадрид':'Madrid','мілан':'Milan','венеція':'Venice',
          'сінгапур':'Singapore','сеул':'Seoul','пекін':'Beijing','шанхай':'Shanghai',
          'москва':'Moscow','санкт-петербург':'Saint Petersburg','київ':'Kyiv',
          'львів':'Lviv','одеса':'Odesa','харків':'Kharkiv','дніпро':'Dnipro',
          'женева':'Geneva','цюрих':'Zurich','брюссель':'Brussels','афіни':'Athens',
          'дубровник':'Dubrovnik','котор':'Kotor','сплит':'Split','белград':'Belgrade',
          'тіват':'Tivat','бар':'Bar','будва':'Budva','копенгаген':'Copenhagen',
          'стокгольм':'Stockholm','осло':'Oslo','гельсінкі':'Helsinki','рейкявік':'Reykjavik',
          'монреаль':'Montreal','ванкувер':'Vancouver','торонто':'Toronto','лос-анджелес':'Los Angeles',
          'сан-франциско':'San Francisco','чикаго':'Chicago','маямі':'Miami',
          'ріо':'Rio de Janeiro','буенос-айрес':'Buenos Aires','богота':'Bogota',
          'дублін':'Dublin','едінбург':'Edinburgh','манчестер':'Manchester',
          'марракеш':'Marrakech','каїр':'Cairo','кейптаун':'Cape Town',
          'найробі':'Nairobi','бомбей':'Mumbai','делі':'Delhi','калькутта':'Kolkata',
          'гонконг':'Hong Kong','тайпей':'Taipei','осака':'Osaka','кіото':'Kyoto',
          'балі':'Bali','пхукет':'Phuket','ханой':'Hanoi','хошімін':'Ho Chi Minh City',
          'сідней':'Sydney','мельбурн':'Melbourne','окленд':'Auckland',
        }
        const key_lower = destination.toLowerCase().trim()
        const query = CITY_EN[key_lower] ?? destination
        const res = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=30&orientation=landscape`,
          { headers: { Authorization: `Client-ID ${key}` } }
        )
        if (!res.ok) return
        const data = await res.json() as { results: Array<{ urls: { regular: string }; user: { name: string } }> }
        if (!cancelled && data.results?.length) {
          setUnsplashPhotos(data.results.map(p => ({ url: p.urls.regular, attribution: `Photo by ${p.user.name} on Unsplash` })))
          setUnsplashIndex(0)
        }
      } catch { /* silent */ }
    }
    load()
    return () => { cancelled = true }
  }, [space?.type, space?.coverUrl, space?.tripProfile?.destination])

  useEffect(() => {
    if (showNoteInput) noteTextareaRef.current?.focus()
  }, [showNoteInput])

  useEffect(() => {
    if (showTaskInput) taskInputRef.current?.focus()
  }, [showTaskInput])

  // Populate edit form when opening
  const openEdit = () => {
    if (!space) return
    setEditName(space.name)
    setEditEmoji(space.emoji ?? '')
    setEditColor(space.color)
    setEditType(space.type)
    setEditCoverUrl(space.coverUrl ?? '')
    setEditCoverPosition(space.coverPosition ?? 'center')
    setEditBudget(space.budget != null ? String(space.budget) : '')
    setEditBudgetCurrency(space.budgetCurrency ?? 'UAH')
    setEditModules(space.modules ?? [])
    setConfirmDelete(false)
    setEditOpen(true)
  }

  // ── Handlers ──

  const parseMemories = async (res: Response): Promise<Memory[]> => {
    const raw = await res.json() as Record<string, unknown>[]
    return raw.map(d => ({
      id: String(d._id ?? ''), userId: String(d.userId ?? ''),
      title: String(d.title ?? ''), date: String(d.date ?? ''),
      dateEnd: (d.dateEnd as string | null) ?? null, isTrip: Boolean(d.isTrip),
      coverUrl: String(d.coverUrl ?? ''), coverAttribution: d.coverAttribution as string | undefined,
      location: d.location as string | undefined, lat: (d.lat as number | null) ?? null,
      lng: (d.lng as number | null) ?? null, notes: String(d.notes ?? ''),
      tags: (d.tags as string[]) ?? [], photos: [], places: [],
      createdAt: String(d.createdAt ?? ''), spaceId: (d.spaceId as string | null) ?? null,
      withProfiles: (d.withProfiles as string[]) ?? [],
    }))
  }

  const handleAddMemory = async (data: AddMemoryData) => {
    await addMemory({ ...data, photos: [], spaceId: spaceId ?? null })
    const res = await authFetch(`/api/memories?spaceId=${spaceId}`)
    if (res.ok) setMemories(await parseMemories(res))
    setAddMemOpen(false)
  }

  const handleAddPlan = async (data: PlanInput) => {
    await addPlan({ ...data, spaceId: spaceId ?? null })
    const res = await authFetch(`/api/plans?spaceId=${spaceId}`)
    if (res.ok) setPlans(await res.json() as Plan[])
    setAddPlanOpen(false)
  }

  const handleOpenNoteInput = () => {
    setShowNoteInput(true)
    setTimeout(() => notesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const handleSaveNote = useCallback(async () => {
    const text = noteText.trim()
    if (!text) { setShowNoteInput(false); return }
    await addNote(text, spaceId)
    const res = await authFetch(`/api/notes?spaceId=${spaceId}`)
    if (res.ok) setSpaceNotes(await res.json() as Note[])
    setNoteText('')
    setShowNoteInput(false)
  }, [noteText, spaceId, addNote])

  const handleDeleteNote = async (noteId: string) => {
    setSpaceNotes(prev => prev?.filter(n => n._id !== noteId) ?? [])
    await deleteNote(noteId)
  }

  const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveNote() }
    if (e.key === 'Escape') { setShowNoteInput(false); setNoteText('') }
  }

  const handleOpenTaskInput = () => {
    setShowTaskInput(true)
    setTimeout(() => tasksSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const handleSaveTask = useCallback(async () => {
    const title = taskInputText.trim()
    if (!title || savingTask) return
    let cancelled = false
    const save = async () => {
      setSavingTask(true)
      try {
        const weekStart = getCurrentWeekStart()
        const res = await authFetch('/api/sprint/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, spaceId, weekStart, type: 'task' }),
        })
        if (!cancelled && res.ok) {
          const created = await res.json() as SpaceTask
          setSpaceTasks(prev => [...(prev ?? []), created])
          setTaskInputText('')
          setShowTaskInput(false)
        }
      } finally {
        if (!cancelled) setSavingTask(false)
      }
    }
    save()
    return () => { cancelled = true }
  }, [taskInputText, spaceId, savingTask])

  const handleToggleTask = async (task: SpaceTask) => {
    setSpaceTasks(prev => prev?.map(t => t._id === task._id ? { ...t, done: !t.done } : t) ?? [])
    await authFetch(`/api/sprint/tasks/${task._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !task.done }),
    })
  }

  const handleDeleteTask = async (taskId: string) => {
    setSpaceTasks(prev => prev?.filter(t => t._id !== taskId) ?? [])
    await authFetch(`/api/sprint/tasks/${taskId}`, { method: 'DELETE' })
  }

  const handleTaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSaveTask() }
    if (e.key === 'Escape') { setShowTaskInput(false); setTaskInputText('') }
  }

  const handleSaveEdit = async () => {
    if (!space || !editName.trim()) return
    let cancelled = false
    const save = async () => {
      setEditSaving(true)
      try {
        const budgetVal = editBudget.trim() ? parseFloat(editBudget) : null
        await updateSpace(space.id, {
          name:           editName.trim(),
          emoji:          editEmoji.trim() || undefined,
          color:          editColor,
          type:           editType,
          coverUrl:       editCoverUrl,
          coverPosition:  editCoverPosition,
          budget:         isNaN(budgetVal as number) ? null : budgetVal,
          budgetCurrency: editBudgetCurrency,
          modules:        editModules,
        })
        if (!cancelled) { setEditOpen(false); showToast('Збережено', 'success') }
      } catch {
        if (!cancelled) showToast('Помилка збереження', 'error')
      } finally {
        if (!cancelled) setEditSaving(false)
      }
    }
    save()
    return () => { cancelled = true }
  }

  const handleAcceptBudgetSuggestion = async (suggested: number) => {
    if (!space) return
    try {
      await updateSpace(space.id, { budget: suggested, budgetCurrency: space.budgetCurrency ?? 'UAH' })
      showToast(`Бюджет ₴${suggested} встановлено`, 'success')
    } catch {
      showToast('Помилка збереження', 'error')
    }
  }

  const handleDismissBudgetSuggest = () => {
    localStorage.setItem(`budget-suggest-dismissed-${spaceId}`, '1')
    setBudgetSuggestDismissed(true)
  }

  const handleDelete = async () => {
    if (!space) return
    await deleteSpace(space.id)
    navigate(-1)
  }

  const handleArchive = async () => {
    if (!space) return
    await archiveSpace(space.id)
    navigate(-1)
  }

  const handleAddMember = async () => {
    if (!space || !memberInput.trim()) return
    let cancelled = false
    const submit = async () => {
      setAddingMember(true)
      try {
        await addMember(space.id, memberInput.trim())
        if (!cancelled) { setMemberInput(''); showToast('Учасника додано', 'success') }
      } catch (err) {
        if (!cancelled) showToast(err instanceof Error ? err.message : 'Не знайдено', 'error')
      } finally {
        if (!cancelled) setAddingMember(false)
      }
    }
    submit()
    return () => { cancelled = true }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!space) return
    await removeMember(space.id, userId)
    showToast('Видалено', 'success')
  }

  // ── Render ──

  if (!loading && !space) {
    return (
      <div className={styles.root}>
        <AppHeader />
        <div className={styles.notFound}>
          <p>Простір не знайдено</p>
          <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>← Назад</button>
        </div>
      </div>
    )
  }

  const ctx = SPACE_CONTEXT[space?.type ?? ''] ?? DEFAULT_CTX
  const spaceColor = space?.color || 'var(--accent)'
  const colorVar = { '--space-color': spaceColor } as React.CSSProperties
  const isOwner = space?.ownerId === myId

  return (
    <div className={styles.root}>
      <AppHeader />

      {/* ── Hero (hidden for vehicle + pet — they render their own) ── */}
      {space?.type !== 'vehicle' && space?.type !== 'pet' && <div
        className={`${styles.hero} ${styles.heroCovered}`}
      >
        <img
          src={space?.coverUrl || unsplashHeroUrl || SPACE_TYPE_CONFIG[space?.type ?? 'blank']?.iconSrc || SPACE_TYPE_CONFIG.blank.iconSrc}
          alt=""
          className={styles.heroCoverImg}
          style={{ objectPosition: (space?.coverUrl || unsplashHeroUrl) ? `center ${space?.coverPosition ?? 'center'}` : 'center center' }}
          aria-hidden="true"
        />
        <div className={styles.heroCoverOverlay} style={(space?.coverUrl || unsplashHeroUrl) ? undefined : colorVar} />
        {unsplashAttribution && !space?.coverUrl && space?.type !== 'trip' && (
          <div className={styles.heroUnsplashRow}>
            {unsplashPhotos.length > 1 && (
              <button
                type="button"
                className={styles.heroUnsplashRefresh}
                onClick={() => setUnsplashIndex(i => (i + 1) % unsplashPhotos.length)}
                aria-label="Інше фото"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
              </button>
            )}
            <span className={styles.heroUnsplashAttribution}>{unsplashAttribution}</span>
          </div>
        )}

        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Назад">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4l-5 5 5 5"/>
          </svg>
        </button>
        {isOwner && (
          <button type="button" className={styles.editBtn} onClick={openEdit} aria-label="Редагувати простір">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z"/>
            </svg>
          </button>
        )}
        {space && (
          <div className={styles.heroInfo}>
            <span className={styles.heroType} style={colorVar}>
              {ctx.typeLabel || space?.type}
            </span>
            <h1 className={`${styles.heroName} ${styles.heroNameCovered}`}>{space?.name}</h1>
          </div>
        )}
      </div>}

      {/* ── Overview (hidden for vehicle + pet) ── */}
      {space?.type !== 'vehicle' && space?.type !== 'pet' && (() => {
        const isTyped = ['plant', 'pet', 'trip'].includes(space?.type ?? '')
        const showPlans = !isTyped || (space?.modules ?? []).includes('plans')
        const overviewItems = [
          { num: memories?.length ?? null,                desc: (memories?.length ?? 0) === 1 ? 'спогад' : (memories?.length ?? 0) < 5 ? 'спогади' : 'спогадів' },
          ...(showPlans ? [{ num: plans?.length ?? null, desc: (plans?.length ?? 0) === 1 ? 'план' : (plans?.length ?? 0) < 5 ? 'плани' : 'планів' }] : []),
          { num: spaceTasks != null ? spaceTasks.filter(t => !t.done).length : null, desc: 'активних задач' },
          { num: space?.members.length ?? 0,              desc: (space?.members.length ?? 0) === 1 ? 'учасник' : 'учасників' },
        ]
        return (
          <div className={styles.overview}>
            {overviewItems.map(item => (
              <div key={item.desc} className={styles.overviewItem}>
                <span className={styles.overviewNum}>{item.num == null ? '—' : item.num}</span>
                <span className={styles.overviewLabel}>{item.num == null ? '…' : item.num === 0 ? `немає ${item.desc}` : item.desc}</span>
              </div>
            ))}
          </div>
        )
      })()}

      {/* ── Budget / spending block (hidden for vehicle + pet) ── */}
      {space?.type !== 'vehicle' && space?.type !== 'pet' && (() => {
        const spent = (spaceTxs ?? []).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        const sym   = space?.budgetCurrency === 'USD' ? '$' : space?.budgetCurrency === 'EUR' ? '€' : '₴'
        if (space?.budget != null) {
          const pct      = Math.min(100, (spent / space.budget) * 100)
          const barColor: 'green' | 'gold' | 'red' = pct < 80 ? 'green' : pct < 100 ? 'gold' : 'red'
          return (
            <div className={styles.budgetBar} style={colorVar}>
              <div className={styles.budgetRow}>
                <span className={styles.budgetLabel}>БЮДЖЕТ</span>
                <span className={styles.budgetAmounts}>
                  <span className={`${styles.budgetSpent} ${styles[`budgetSpent_${barColor}`]}`}>
                    {sym}{formatTxAmount(spent)}
                  </span>
                  <span className={styles.budgetSep}>/</span>
                  <span className={styles.budgetTotal}>{sym}{formatTxAmount(space.budget)}</span>
                </span>
              </div>
              <ProgressBar value={spent} max={space.budget} color={barColor} />
              {pct >= 100 && <span className={styles.budgetOver}>Бюджет перевищено</span>}
            </div>
          )
        }
        if (spent > 0) {
          const expenses    = (spaceTxs ?? []).filter(t => t.type === 'expense')
          const showSuggest = !budgetSuggestDismissed && expenses.length >= 20
          let suggested: number | null = null
          if (showSuggest) {
            const dates    = expenses.map(t => new Date(t.date).getTime()).sort((a, b) => a - b)
            const spanDays = Math.max(1, (dates[dates.length - 1] - dates[0]) / 86_400_000)
            const perMonth = (spent / spanDays) * 30
            const step     = perMonth >= 500 ? 100 : 50
            suggested      = Math.ceil(perMonth / step) * step
          }
          const months = (() => {
            if (!showSuggest) return ''
            const expenses2 = (spaceTxs ?? []).filter(t => t.type === 'expense')
            const dates2    = expenses2.map(t => new Date(t.date).getTime()).sort((a, b) => a - b)
            const spanDays2 = (dates2[dates2.length - 1] - dates2[0]) / 86_400_000
            const m         = Math.round(spanDays2 / 30)
            return m <= 1 ? 'місяць' : `${m} місяці`
          })()
          return (
            <div className={styles.budgetBar} style={colorVar}>
              <div className={styles.budgetRow}>
                <span className={styles.budgetLabel}>ВИТРАТИ</span>
                <span className={`${styles.budgetSpent} ${styles.budgetSpent_green}`}>
                  {sym}{formatTxAmount(spent)}
                </span>
              </div>
              {showSuggest && suggested != null && (
                <div className={styles.budgetSuggest}>
                  <p className={styles.budgetSuggestText}>
                    За {months} ти витратив {sym}{formatTxAmount(spent)} — виходить ~{sym}{formatTxAmount(suggested)}/міс. Встановити як бюджет?
                  </p>
                  <div className={styles.budgetSuggestBtns}>
                    <button
                      type="button"
                      className={styles.budgetSuggestAccept}
                      style={colorVar}
                      onClick={() => handleAcceptBudgetSuggestion(suggested!)}
                    >
                      Встановити {sym}{formatTxAmount(suggested)}
                    </button>
                    <button
                      type="button"
                      className={styles.budgetSuggestDismiss}
                      onClick={handleDismissBudgetSuggest}
                    >
                      Пізніше
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        }
        return null
      })()}

      {/* ── Typed views (replace generic content) ── */}
      {space?.type === 'vehicle' && (
        <VehicleSpaceView
          spaceId={spaceId!}
          color={space.color || 'var(--accent)'}
          spaceName={space.name}
          memoriesCount={memories?.length ?? 0}
          plansCount={plans?.length ?? 0}
          tasksCount={spaceTasks?.length ?? 0}
          membersCount={space.members.length}
          modules={space.modules ?? []}
          spaceTxs={spaceTxs ?? []}
          isOwner={isOwner}
          coverUrl={space.coverUrl}
          coverPosition={space.coverPosition}
          onEditSpace={openEdit}
          onBack={() => navigate(-1)}
        />
      )}
      {space?.type === 'plant' && (
        <PlantSpaceView
          spaceId={spaceId!}
          color={space.color || 'var(--accent)'}
          profile={space.plantProfile}
          onProfileUpdate={p => setPlantProfile(space.id, p)}
        />
      )}
      {space?.type === 'pet' && (
        <PetSpaceView
          spaceId={spaceId!}
          color={space.color || 'var(--accent)'}
          spaceName={space.name}
          profile={space.petProfile}
          onProfileUpdate={p => setPetProfile(space.id, p)}
          coverUrl={space.coverUrl}
          coverPosition={space.coverPosition}
          isOwner={isOwner}
          onEditSpace={openEdit}
          onBack={() => navigate(-1)}
          spaceTxs={spaceTxs ?? []}
        />
      )}

      {/* ── Shared modules for typed spaces (pet / plant) ── */}
      {(space?.type === 'pet' || space?.type === 'plant') && !loading && (
        <div className={styles.content}>
          {(spaceTasks?.length ?? 0) > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>ЗАДАЧІ</h2>
              <div className={styles.tasksList}>
                {(spaceTasks ?? []).map(t => (
                  <SpaceTaskItem key={t._id} task={t} spaceColor={space?.color} onToggle={handleToggleTask} onDelete={handleDeleteTask} />
                ))}
              </div>
            </section>
          )}

          {(spaceTxs?.length ?? 0) > 0 && space?.type !== 'pet' && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>ВИТРАТИ</h2>
              <div className={styles.txList}>
                {(spaceTxs ?? []).map((t, idx) => {
                  const curDate  = t.date.slice(0, 10)
                  const prevDate = idx > 0 ? spaceTxs![idx - 1].date.slice(0, 10) : null
                  const isIncome = t.type === 'income'
                  const catColor = isIncome ? 'var(--positive)' : 'var(--negative)'
                  return (
                    <React.Fragment key={t._id}>
                      {curDate !== prevDate && (
                        <div className={styles.txDateHeader}>{formatTxDateHeader(curDate)}</div>
                      )}
                      <div className={styles.spaceTx}>
                        <div className={styles.txLeft}>
                          <div className={styles.txTypeIcon} style={{ '--cat-color': catColor } as React.CSSProperties}>
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              {isIncome
                                ? <path d="M8 13V3M3 8l5-5 5 5"/>
                                : <path d="M8 3v10M3 8l5 5 5-5"/>
                              }
                            </svg>
                          </div>
                          <div className={styles.txContent}>
                            <span className={styles.txTitle}>{t.title || t.desc || t.category || '—'}</span>
                            {t.category && <span className={styles.txSub}>{t.category}</span>}
                          </div>
                        </div>
                        <span className={`${styles.txAmount} ${isIncome ? styles.txAmountPos : styles.txAmountNeg}`}>
                          {isIncome ? '+' : '−'}₴{formatTxAmount(t.amount)}
                        </span>
                      </div>
                    </React.Fragment>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {space?.type === 'trip' && (
        <TripSpaceView
          spaceId={spaceId!}
          color={space.color || 'var(--accent)'}
          profile={space.tripProfile}
          onProfileUpdate={p => setTripProfile(space.id, p)}
          spaceTxs={spaceTxs ?? []}
          canCycleCover={unsplashPhotos.length > 1 && !space.coverUrl}
          onCycleCover={() => setUnsplashIndex(i => (i + 1) % unsplashPhotos.length)}
        />
      )}

      {/* ── Quick actions (trip space) ── */}
      {space?.type === 'trip' && (
      <div className={styles.actions} style={colorVar}>
        {/* Row 1 */}
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={() => setAddTicketOpen(true)}>
          <span className={styles.actionBtnIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          </span>
          Квиток
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={styles.actionBtnPlus} aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
        </button>
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={() => setAddAccomOpen(true)}>
          <span className={styles.actionBtnIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </span>
          Проживання
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={styles.actionBtnPlus} aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
        </button>
        {/* Row 2 */}
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={() => setAddTripPlaceOpen(true)}>
          <span className={styles.actionBtnIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
          </span>
          Місце
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={styles.actionBtnPlus} aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
        </button>
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={handleOpenTaskInput}>
          <span className={styles.actionBtnIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </span>
          Задача
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={styles.actionBtnPlus} aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
        </button>
        {/* Row 3 */}
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={() => setAddExpenseOpen(true)}>
          <span className={styles.actionBtnIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
          </span>
          Витрата
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={styles.actionBtnPlus} aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
        </button>
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={() => setAddMemOpen(true)}>
          <span className={styles.actionBtnIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </span>
          Спогад
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={styles.actionBtnPlus} aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
        </button>
        {/* Mimir — compact pill */}
        <button type="button" className={`${styles.actionBtn} ${styles.actionBtnMimirTrip}`} style={colorVar} onClick={() => setChatOpen(true)}>
          <MimirIcon size={13} />
          Запитати Міміра
        </button>
      </div>
      )}

      {/* ── Trip sheets ── */}
      {space?.type === 'trip' && spaceId && (
        <>
          <AddTicketSheet
            isOpen={addTicketOpen}
            spaceId={spaceId}
            color={space.color || 'var(--accent)'}
            onClose={() => setAddTicketOpen(false)}
          />
          <AddAccommodationSheet
            isOpen={addAccomOpen}
            spaceId={spaceId}
            color={space.color || 'var(--accent)'}
            onClose={() => setAddAccomOpen(false)}
          />
          <AddPlaceSheet
            isOpen={addTripPlaceOpen}
            spaceId={spaceId}
            color={space.color || 'var(--accent)'}
            destination={space.tripProfile?.destination || undefined}
            onClose={() => setAddTripPlaceOpen(false)}
          />
          <AddSpaceExpenseSheet
            isOpen={addExpenseOpen}
            spaceId={spaceId}
            color={space.color || 'var(--accent)'}
            onClose={() => setAddExpenseOpen(false)}
            onExpenseAdded={tx => setSpaceTxs(prev => [tx, ...(prev ?? [])])}
          />
        </>
      )}

      {space?.type !== 'vehicle' && space?.type !== 'plant' && space?.type !== 'pet' && space?.type !== 'trip' && (
      <div className={styles.actions}>
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={() => setAddMemOpen(true)}>
          <span className={styles.actionBtnIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </span>
          {ctx.memBtnLabel.replace('+ ', '')}
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={styles.actionBtnPlus} aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
        </button>
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={() => setAddPlanOpen(true)}>
          <span className={styles.actionBtnIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          </span>
          {ctx.planBtnLabel.replace('+ ', '')}
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={styles.actionBtnPlus} aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
        </button>
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={handleOpenNoteInput}>
          <span className={styles.actionBtnIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </span>
          Нотатка
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={styles.actionBtnPlus} aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
        </button>
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={handleOpenTaskInput}>
          <span className={styles.actionBtnIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </span>
          {ctx.taskBtnLabel.replace('+ ', '')}
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={styles.actionBtnPlus} aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
        </button>
        <button type="button" className={`${styles.actionBtn} ${styles.actionBtnMimir}`} style={colorVar} onClick={() => setChatOpen(true)}>
          <MimirIcon size={14} />
          Мімір
        </button>
      </div>
      )}

      {space?.type !== 'vehicle' && space?.type !== 'plant' && space?.type !== 'pet' && space?.type !== 'trip' && (
      <div className={styles.content}>

        {/* ── Members ── */}
        {space && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>УЧАСНИКИ</h2>
            <div className={styles.members}>
              {space?.members.map(m => (
                <div key={m.userId} className={styles.member}>
                  {m.avatarUrl
                    ? <img src={m.avatarUrl} className={styles.memberAvatar} alt={m.name} />
                    : <span className={styles.memberInitial} style={colorVar}>{m.name[0]?.toUpperCase()}</span>
                  }
                  <div className={styles.memberMeta}>
                    <span className={styles.memberName}>{m.name}</span>
                    <span className={styles.memberUsername}>@{m.username}</span>
                  </div>
                  {m.role === 'owner'
                    ? <span className={styles.ownerBadge}>власник</span>
                    : (isOwner || m.userId === myId) && (
                        <button
                          type="button"
                          className={styles.removeMemberBtn}
                          onClick={() => handleRemoveMember(m.userId)}
                          aria-label="Видалити учасника"
                        >
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                            <path d="M2 2l10 10M12 2L2 12"/>
                          </svg>
                        </button>
                      )
                  }
                </div>
              ))}
            </div>

            {/* Add member — owner only */}
            {isOwner && (
              <div className={styles.addMemberRow}>
                <input
                  className={styles.addMemberInput}
                  value={memberInput}
                  onChange={e => setMemberInput(e.target.value)}
                  placeholder="Додати за username…"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddMember() }}
                />
                <button
                  type="button"
                  className={styles.addMemberBtn}
                  style={colorVar}
                  onClick={handleAddMember}
                  disabled={addingMember || !memberInput.trim()}
                >
                  {addingMember ? '…' : 'Додати'}
                </button>
              </div>
            )}
          </section>
        )}

        {/* ── Memories ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>СПОГАДИ</h2>
          {memories === null ? (
            <div className={styles.memoriesGrid}>{[1,2,3,4].map(i => <div key={i} className={styles.skeleton} />)}</div>
          ) : memories.length === 0 ? (
            <div className={styles.empty}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" aria-hidden="true">
                <circle cx="16" cy="12" r="5"/><path d="M6 28c0-5.5 4.5-10 10-10s10 4.5 10 10"/>
              </svg>
              <p className={styles.emptyTitle}>{ctx.memEmptyTitle}</p>
              <p className={styles.emptyDesc}>{ctx.memEmptyDesc}</p>
              <button type="button" className={styles.emptyAction} style={colorVar} onClick={() => setAddMemOpen(true)}>{ctx.memBtnLabel}</button>
            </div>
          ) : (
            <div className={styles.memoriesGrid}>
              {memories.map(m => <MemoryCard key={m.id} memory={m} onClick={() => navigate(`/memories/${m.id}`)} />)}
            </div>
          )}
        </section>

        {/* ── Plans ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>ПЛАНИ</h2>
          {plans === null ? (
            <div className={styles.plansCol}>{[1,2].map(i => <div key={i} className={`${styles.skeleton} ${styles.skeletonPlan}`} />)}</div>
          ) : plans.length === 0 ? (
            <div className={styles.empty}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" aria-hidden="true">
                <rect x="6" y="8" width="20" height="18" rx="3"/>
                <path d="M11 14h10M11 19h7M20 4v8M12 4v8"/>
              </svg>
              <p className={styles.emptyTitle}>{ctx.planEmptyTitle}</p>
              <p className={styles.emptyDesc}>{ctx.planEmptyDesc}</p>
              <button type="button" className={styles.emptyAction} style={colorVar} onClick={() => setAddPlanOpen(true)}>{ctx.planBtnLabel}</button>
            </div>
          ) : (
            <div className={styles.plansCol}>
              {plans.map(p => <PlanCard key={p._id} plan={p} onClick={() => navigate(`/memories?plan=${p._id}`)} />)}
            </div>
          )}
        </section>

        {/* ── Notes ── */}
        <section className={styles.section} ref={notesSectionRef}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>НОТАТКИ</h2>
            {!showNoteInput && (
              <button type="button" className={styles.sectionAddBtn} style={colorVar} onClick={handleOpenNoteInput} aria-label="Додати нотатку">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
              </button>
            )}
          </div>

          {showNoteInput && (
            <div className={styles.noteInputWrap}>
              <textarea
                ref={noteTextareaRef}
                className={styles.noteInputTextarea}
                placeholder="Що хочеш записати?"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={handleNoteKeyDown}
                rows={3}
              />
              <div className={styles.noteInputRow}>
                <button type="button" className={styles.noteInputCancel} onClick={() => { setShowNoteInput(false); setNoteText('') }}>Скасувати</button>
                <button type="button" className={styles.noteInputSave} style={colorVar} onClick={handleSaveNote} disabled={!noteText.trim()}>Зберегти</button>
              </div>
            </div>
          )}

          {spaceNotes === null ? (
            <div className={styles.plansCol}>{[1,2].map(i => <div key={i} className={`${styles.skeleton} ${styles.skeletonNote}`} />)}</div>
          ) : spaceNotes.length === 0 && !showNoteInput ? (
            <div className={styles.empty}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" aria-hidden="true">
                <path d="M8 6h16a2 2 0 0 1 2 2v18l-4-3H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>
                <path d="M11 13h10M11 18h6"/>
              </svg>
              <p className={styles.emptyTitle}>{ctx.noteEmptyTitle}</p>
              <p className={styles.emptyDesc}>{ctx.noteEmptyDesc}</p>
              <button type="button" className={styles.emptyAction} style={colorVar} onClick={handleOpenNoteInput}>{ctx.noteBtnLabel}</button>
            </div>
          ) : (
            <div className={styles.notesList}>
              {spaceNotes.map(n => (
                <div key={n._id} className={styles.spaceNote}>
                  <p className={styles.spaceNoteText}>{n.text}</p>
                  <div className={styles.spaceNoteMeta}>
                    <span className={styles.spaceNoteDate}>{formatNoteDate(n.updatedAt)}</span>
                    <button type="button" className={styles.spaceNoteDelete} onClick={() => handleDeleteNote(n._id)} aria-label="Видалити нотатку">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        {/* ── Tasks ── */}
        <section className={styles.section} ref={tasksSectionRef}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>ЗАДАЧІ</h2>
            {!showTaskInput && (
              <button type="button" className={styles.sectionAddBtn} style={colorVar} onClick={handleOpenTaskInput} aria-label="Додати задачу">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
              </button>
            )}
          </div>

          {showTaskInput && (
            <div className={styles.taskInputRow}>
              <input
                ref={taskInputRef}
                className={styles.taskInput}
                placeholder="Нова задача…"
                value={taskInputText}
                onChange={e => setTaskInputText(e.target.value)}
                onKeyDown={handleTaskKeyDown}
                maxLength={200}
              />
              <button type="button" className={styles.noteInputCancel} onClick={() => { setShowTaskInput(false); setTaskInputText('') }}>Скас.</button>
              <button type="button" className={styles.noteInputSave} style={colorVar} onClick={handleSaveTask} disabled={!taskInputText.trim() || savingTask}>
                {savingTask ? '…' : 'OK'}
              </button>
            </div>
          )}

          {spaceTasks === null ? (
            <div className={styles.plansCol}>{[1, 2].map(i => <div key={i} className={`${styles.skeleton} ${styles.skeletonNote}`} />)}</div>
          ) : spaceTasks.length === 0 && !showTaskInput ? (
            <div className={styles.empty}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" aria-hidden="true">
                <rect x="6" y="6" width="20" height="20" rx="3"/>
                <path d="M11 16l3 3 7-7"/>
              </svg>
              <p className={styles.emptyTitle}>{ctx.taskEmptyTitle}</p>
              <p className={styles.emptyDesc}>{ctx.taskEmptyDesc}</p>
              <button type="button" className={styles.emptyAction} style={colorVar} onClick={handleOpenTaskInput}>{ctx.taskBtnLabel}</button>
            </div>
          ) : (
            <div className={styles.tasksList}>
              {spaceTasks.map(t => (
                <SpaceTaskItem key={t._id} task={t} spaceColor={space?.color} onToggle={handleToggleTask} onDelete={handleDeleteTask} />
              ))}
            </div>
          )}
        </section>

        {/* ── Transactions ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>ВИТРАТИ</h2>

          {spaceTxs === null ? (
            <div className={styles.plansCol}>{[1, 2].map(i => <div key={i} className={`${styles.skeleton} ${styles.skeletonNote}`} />)}</div>
          ) : spaceTxs.length === 0 ? (
            <div className={styles.empty}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" aria-hidden="true">
                <rect x="4" y="8" width="24" height="18" rx="3"/>
                <path d="M4 14h24M10 20h4"/>
              </svg>
              <p className={styles.emptyTitle}>{ctx.txEmptyTitle}</p>
              <p className={styles.emptyDesc}>{ctx.txEmptyDesc}</p>
            </div>
          ) : (
            <>
              <div className={styles.txList}>
                {spaceTxs.map((t, idx) => {
                  const curDate  = t.date.slice(0, 10)
                  const prevDate = idx > 0 ? spaceTxs[idx - 1].date.slice(0, 10) : null
                  const isIncome = t.type === 'income'
                  const catColor = isIncome ? 'var(--positive)' : 'var(--negative)'
                  return (
                    <React.Fragment key={t._id}>
                      {curDate !== prevDate && (
                        <div className={styles.txDateHeader}>{formatTxDateHeader(curDate)}</div>
                      )}
                      <div className={styles.spaceTx}>
                        <div className={styles.txLeft}>
                          <div className={styles.txTypeIcon} style={{ '--cat-color': catColor } as React.CSSProperties}>
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              {isIncome
                                ? <path d="M8 13V3M3 8l5-5 5 5"/>
                                : <path d="M8 3v10M3 8l5 5 5-5"/>
                              }
                            </svg>
                          </div>
                          <div className={styles.txContent}>
                            <span className={styles.txTitle}>{t.title || t.desc || t.category || '—'}</span>
                            {t.category && <span className={styles.txSub}>{t.category}</span>}
                          </div>
                        </div>
                        <span className={`${styles.txAmount} ${isIncome ? styles.txAmountPos : styles.txAmountNeg}`}>
                          {isIncome ? '+' : '−'}₴{formatTxAmount(t.amount)}
                        </span>
                      </div>
                    </React.Fragment>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </div>

      )}

      {/* ── Modals ── */}
      <AddMemoryModal isOpen={addMemOpen} onClose={() => setAddMemOpen(false)} onCreate={handleAddMemory} initialSpaceId={spaceId} />
      {addPlanOpen && <PlanForm onClose={() => setAddPlanOpen(false)} onSubmit={handleAddPlan} initialSpaceId={spaceId} />}
      {space && <SpaceChatSheet isOpen={chatOpen} onClose={() => setChatOpen(false)} space={space} />}

      {/* ══ Edit Sheet ══ */}
      {editOpen && (
        <div className={styles.overlay} ref={editOverlayRef} onClick={() => setEditOpen(false)}>
          <div className={styles.editSheet} ref={editSheetRef} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h2 className={styles.sheetTitle}>Редагувати простір</h2>

            <label className={styles.fieldLabel}>НАЗВА</label>
            <input
              className={styles.fieldInput}
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="Назва простору"
              maxLength={60}
            />

            <label className={styles.fieldLabel}>КОЛІР</label>
            <div className={styles.colorRow}>
              {COLORS.map(c => (
                <button
                  key={c || 'default'}
                  type="button"
                  className={`${styles.colorDot} ${c === '' ? styles.colorDotDefault : ''} ${editColor === c ? styles.colorDotOn : ''}`}
                  style={c ? { background: c } : undefined}
                  onClick={() => setEditColor(c)}
                  aria-label={c || 'За замовчуванням'}
                />
              ))}
            </div>

            <label className={styles.fieldLabel}>ОБКЛАДИНКА</label>
            <ImageUploadButton
              currentUrl={editCoverUrl || undefined}
              folder="spaces"
              onUpload={setEditCoverUrl}
              placeholder="Завантажити обкладинку"
              variant="wide"
              objectPosition={editCoverUrl ? `center ${editCoverPosition}` : undefined}
            />
            {editCoverUrl && (
              <div className={styles.coverPositionRow}>
                {(['top', 'center', 'bottom'] as const).map(pos => (
                  <button
                    key={pos}
                    type="button"
                    className={`${styles.coverPositionBtn} ${editCoverPosition === pos ? styles.coverPositionBtnActive : ''}`}
                    onClick={() => setEditCoverPosition(pos)}
                  >
                    {pos === 'top' ? 'Верх' : pos === 'center' ? 'Центр' : 'Низ'}
                  </button>
                ))}
              </div>
            )}

            <label className={styles.fieldLabel}>БЮДЖЕТ</label>
            <div className={styles.budgetInputRow}>
              <input
                type="number"
                className={`${styles.fieldInput} ${styles.budgetInput}`}
                value={editBudget}
                onChange={e => setEditBudget(e.target.value)}
                placeholder="Не встановлено"
                min={0}
              />
              <div className={styles.currencyPills}>
                {(['UAH', 'USD', 'EUR'] as const).map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`${styles.currencyPill} ${editBudgetCurrency === c ? styles.currencyPillOn : ''}`}
                    onClick={() => setEditBudgetCurrency(c)}
                    style={editBudgetCurrency === c ? colorVar : undefined}
                  >
                    {c === 'UAH' ? '₴' : c === 'USD' ? '$' : '€'}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Modules (typed spaces only) ── */}
            {(['vehicle', 'plant', 'pet', 'trip'] as SpaceType[]).includes(editType) && (() => {
              const ALL_MODULES: { key: string; label: string }[] = [
                { key: 'finance',   label: 'Фінанси' },
                { key: 'tasks',     label: 'Задачі' },
                { key: 'memories',  label: 'Спогади' },
                { key: 'plans',     label: 'Плани' },
                { key: 'notes',     label: 'Нотатки' },
              ]
              const toggleModule = (key: string) =>
                setEditModules(prev =>
                  prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]
                )
              return (
                <>
                  <label className={styles.fieldLabel}>МОДУЛІ</label>
                  <div className={styles.moduleToggles}>
                    {ALL_MODULES.map(m => (
                      <button
                        key={m.key}
                        type="button"
                        className={`${styles.moduleToggle} ${editModules.includes(m.key) ? styles.moduleToggleOn : ''}`}
                        style={editModules.includes(m.key) ? colorVar : undefined}
                        onClick={() => toggleModule(m.key)}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </>
              )
            })()}

            <button
              type="button"
              className={styles.saveBtn}
              style={colorVar}
              onClick={handleSaveEdit}
              disabled={editSaving || !editName.trim()}
            >
              {editSaving ? 'Зберігаємо…' : 'Зберегти'}
            </button>

            <div className={styles.deleteDivider} />

            {isOwner && (
              <button type="button" className={styles.archiveSpaceBtn} onClick={handleArchive}>
                Архівувати простір
              </button>
            )}

            {!confirmDelete ? (
              <button type="button" className={styles.deleteSpaceBtn} onClick={() => setConfirmDelete(true)}>
                Видалити простір
              </button>
            ) : (
              <div className={styles.deleteConfirmRow}>
                <span className={styles.deleteConfirmText}>Видалити назавжди?</span>
                <button type="button" className={styles.deleteConfirmYes} onClick={handleDelete}>Так</button>
                <button type="button" className={styles.deleteConfirmNo} onClick={() => setConfirmDelete(false)}>Ні</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SpaceDetailScreen
