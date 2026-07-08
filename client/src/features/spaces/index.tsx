import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppHeader from '@/shared/components/layout/AppHeader'
import { useSpacesStore, type Space, type SpaceType } from '@/features/memories/store/spacesStore'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import PillSelector from '@/shared/components/ui/PillSelector'
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
import styles from './SpaceDetail.module.css'

// ── Constants ──────────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: SpaceType; label: string }[] = [
  { value: 'personal', label: 'Особистий' },
  { value: 'shared',   label: 'Спільний'  },
  { value: 'trip',     label: 'Поїздка'   },
  { value: 'family',   label: "Сім'я"     },
  { value: 'friends',  label: 'Друзі'     },
  { value: 'hobby',    label: 'Хобі'      },
  { value: 'sports',   label: 'Спорт'     },
  { value: 'project',  label: 'Проект'    },
]

const COLORS = [
  '#9b59b6', '#3498db', '#2ecc71', '#e74c3c',
  '#f39c12', '#1abc9c', '#e91e8c', '#607d8b',
]

// ── Context config ─────────────────────────────────────────────────────────

interface SpaceCtx {
  typeLabel:       string
  description:     string
  memBtnLabel:     string
  planBtnLabel:    string
  noteBtnLabel:    string
  taskBtnLabel:    string
  memEmptyTitle:   string
  memEmptyDesc:    string
  planEmptyTitle:  string
  planEmptyDesc:   string
  noteEmptyTitle:  string
  noteEmptyDesc:   string
  taskEmptyTitle:  string
  taskEmptyDesc:   string
}

interface SpaceTask {
  _id: string
  title: string
  done: boolean
  createdAt: string
}

const SPACE_CONTEXT: Record<string, SpaceCtx> = {
  personal: {
    typeLabel: 'Особисте', description: 'Твій особистий простір — спогади, плани й думки тільки для тебе.',
    memBtnLabel: '+ Спогад', planBtnLabel: '+ План', noteBtnLabel: '+ Нотатка', taskBtnLabel: '+ Задача',
    memEmptyTitle: 'Спогадів ще немає',   memEmptyDesc: 'Додай особистий момент — щось що хочеш запам\'ятати.',
    planEmptyTitle: 'Планів ще немає',    planEmptyDesc: 'Запиши ціль або щось що хочеш зробити.',
    noteEmptyTitle: 'Нотаток ще немає',   noteEmptyDesc: 'Записуй думки, ідеї або що хочеш не забути.',
    taskEmptyTitle: 'Задач ще немає',     taskEmptyDesc: 'Додай що хочеш зробити в цьому просторі.',
  },
  shared: {
    typeLabel: 'Спільне', description: 'Спільний простір для людей, речей і планів що вас об\'єднують.',
    memBtnLabel: '+ Спільний спогад', planBtnLabel: '+ Спільний план', noteBtnLabel: '+ Нотатка', taskBtnLabel: '+ Задача',
    memEmptyTitle: 'Спогадів ще немає',   memEmptyDesc: 'Додай перший спільний момент.',
    planEmptyTitle: 'Планів ще немає',    planEmptyDesc: 'Запиши першу спільну ідею або план.',
    noteEmptyTitle: 'Нотаток ще немає',   noteEmptyDesc: 'Залишай короткі записи для спільного контексту.',
    taskEmptyTitle: 'Задач ще немає',     taskEmptyDesc: 'Додай спільне завдання або чекліст.',
  },
  trip: {
    typeLabel: 'Поїздка', description: 'Збирай тут плани, спогади, місця й враження цієї поїздки — до, під час і після.',
    memBtnLabel: '+ Момент поїздки', planBtnLabel: '+ Ідея маршруту', noteBtnLabel: '+ Нотатка', taskBtnLabel: '+ Що зробити',
    memEmptyTitle: 'Спогадів ще немає',   memEmptyDesc: 'Додай перший момент з цієї поїздки: фото, коротку історію або місце.',
    planEmptyTitle: 'Планів ще немає',    planEmptyDesc: 'Запиши маршрут, ідею, бронювання або щось що хочеш не забути.',
    noteEmptyTitle: 'Нотаток ще немає',   noteEmptyDesc: 'Адреси, рекомендації, що подивитись, де поїсти — все тут.',
    taskEmptyTitle: 'Чекліст порожній',   taskEmptyDesc: 'Купити квитки, забронювати готель, що взяти — записуй тут.',
  },
  family: {
    typeLabel: 'Сім\'я', description: 'Спільний простір для сімейних спогадів, планів і важливих моментів.',
    memBtnLabel: '+ Сімейний спогад', planBtnLabel: '+ Сімейний план', noteBtnLabel: '+ Нотатка', taskBtnLabel: '+ Задача',
    memEmptyTitle: 'Спогадів ще немає',   memEmptyDesc: 'Додай перший сімейний момент — фото, подія або просто що трапилось.',
    planEmptyTitle: 'Планів ще немає',    planEmptyDesc: 'Запиши ідею для спільного часу — поїздка, вечеря, традиція.',
    noteEmptyTitle: 'Нотаток ще немає',   noteEmptyDesc: 'Сімейні нотатки, нагадування, списки — що завгодно.',
    taskEmptyTitle: 'Задач ще немає',     taskEmptyDesc: 'Додай сімейне завдання або що треба зробити разом.',
  },
  friends: {
    typeLabel: 'Друзі', description: 'Збирай тут спільні моменти, плани і що ще хочете зробити разом.',
    memBtnLabel: '+ Спогад з друзями', planBtnLabel: '+ Планую разом', noteBtnLabel: '+ Нотатка', taskBtnLabel: '+ Що зробити разом',
    memEmptyTitle: 'Спогадів ще немає',   memEmptyDesc: 'Збережи перший момент з цими людьми.',
    planEmptyTitle: 'Планів ще немає',    planEmptyDesc: 'Запиши що хочете зробити разом — куди піти, що спробувати.',
    noteEmptyTitle: 'Нотаток ще немає',   noteEmptyDesc: 'Ідеї, адреси, посилання — щоб нічого не загубити.',
    taskEmptyTitle: 'Задач ще немає',     taskEmptyDesc: 'Куди піти, що спробувати, що замовити — фіксуй тут.',
  },
  hobby: {
    typeLabel: 'Хобі', description: 'Простір для занять, прогресу й важливих моментів із цього хобі.',
    memBtnLabel: '+ Подія', planBtnLabel: '+ Ціль', noteBtnLabel: '+ Нотатка', taskBtnLabel: '+ Активність',
    memEmptyTitle: 'Подій ще немає',      memEmptyDesc: 'Додай перший момент з цього хобі — тренування, виступ, досягнення.',
    planEmptyTitle: 'Цілей ще немає',     planEmptyDesc: 'Постав ціль або заплануй наступний крок у цьому хобі.',
    noteEmptyTitle: 'Нотаток ще немає',   noteEmptyDesc: 'Ідеї, референси, налаштування — фіксуй все що важливо.',
    taskEmptyTitle: 'Активностей ще немає', taskEmptyDesc: 'Додай що плануєш зробити або спробувати.',
  },
  sports: {
    typeLabel: 'Спорт', description: 'Тренування, змагання, результати — всі спортивні моменти тут.',
    memBtnLabel: '+ Результат', planBtnLabel: '+ Тренування', noteBtnLabel: '+ Нотатка', taskBtnLabel: '+ Тренування',
    memEmptyTitle: 'Результатів ще немає', memEmptyDesc: 'Додай перше тренування, змагання або досягнення.',
    planEmptyTitle: 'Тренувань ще немає', planEmptyDesc: 'Заплануй наступне тренування або постав спортивну ціль.',
    noteEmptyTitle: 'Нотаток ще немає',   noteEmptyDesc: 'Програми, техніки, PR-и — записуй що важливо.',
    taskEmptyTitle: 'Тренувань ще немає', taskEmptyDesc: 'Додай наступне тренування або спортивну задачу.',
  },
  project: {
    typeLabel: 'Проєкт', description: 'Збирай тут задачі, нотатки й прогрес цього проєкту.',
    memBtnLabel: '+ Milestone', planBtnLabel: '+ Задача', noteBtnLabel: '+ Нотатка', taskBtnLabel: '+ Задача',
    memEmptyTitle: 'Досягнень ще немає',  memEmptyDesc: 'Фіксуй ключові моменти та досягнення проєкту.',
    planEmptyTitle: 'Задач ще немає',     planEmptyDesc: 'Запиши першу задачу або ціль цього проєкту.',
    noteEmptyTitle: 'Нотаток ще немає',   noteEmptyDesc: 'Рішення, думки, лінки, референси — все тут.',
    taskEmptyTitle: 'Задач ще немає',     taskEmptyDesc: 'Починай з першої задачі — великий проєкт складається з малих кроків.',
  },
}

const DEFAULT_CTX: SpaceCtx = {
  typeLabel: '', description: '',
  memBtnLabel: '+ Спогад', planBtnLabel: '+ План', noteBtnLabel: '+ Нотатка', taskBtnLabel: '+ Задача',
  memEmptyTitle: 'Спогадів ще немає', memEmptyDesc: 'Додай перший спогад у цей простір.',
  planEmptyTitle: 'Планів ще немає',  planEmptyDesc: 'Запиши перший план або ціль.',
  noteEmptyTitle: 'Нотаток ще немає', noteEmptyDesc: 'Залишай короткі записи в цьому просторі.',
  taskEmptyTitle: 'Задач ще немає',   taskEmptyDesc: 'Додай першу задачу в цей простір.',
}

function getCurrentWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
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
  const { spaces, fetchSpaces, updateSpace, deleteSpace, addMember, removeMember } = useSpacesStore()
  const myId = useProfileStore(s => s.activeProfile?._id ?? '')
  const { showToast } = useUiStore()
  const { addMemory }  = useMemoriesStore()
  const { addPlan }    = usePlansStore()
  const { addNote, deleteNote } = useNotesStore()

  // ── Content state ──
  const [space, setSpace]             = useState<Space | null>(null)
  const [memories, setMemories]       = useState<Memory[]>([])
  const [plans, setPlans]             = useState<Plan[]>([])
  const [spaceNotes, setSpaceNotes]   = useState<Note[]>([])
  const [spaceTasks, setSpaceTasks]   = useState<SpaceTask[]>([])
  const [loading, setLoading]         = useState(true)

  // ── Modals / Inputs ──
  const [addMemOpen, setAddMemOpen]       = useState(false)
  const [addPlanOpen, setAddPlanOpen]     = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText]           = useState('')
  const [showTaskInput, setShowTaskInput] = useState(false)
  const [taskInputText, setTaskInputText] = useState('')
  const [savingTask, setSavingTask]       = useState(false)

  // ── Edit sheet ──
  const [editOpen, setEditOpen]     = useState(false)
  const [editName, setEditName]     = useState('')
  const [editEmoji, setEditEmoji]   = useState('')
  const [editColor, setEditColor]   = useState(COLORS[0])
  const [editType, setEditType]     = useState<SpaceType>('shared')
  const [editSaving, setEditSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

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

      const [memRes, planRes, noteRes, taskRes] = await Promise.all([
        authFetch(`/api/memories?spaceId=${spaceId}`),
        authFetch(`/api/plans?spaceId=${spaceId}`),
        authFetch(`/api/notes?spaceId=${spaceId}`),
        authFetch(`/api/sprint/tasks?spaceId=${spaceId}`),
      ])
      if (!cancelled) {
        if (memRes.ok) setMemories(await parseMemories(memRes))
        if (planRes.ok) setPlans(await planRes.json() as Plan[])
        if (noteRes.ok) setSpaceNotes(await noteRes.json() as Note[])
        if (taskRes.ok) setSpaceTasks(await taskRes.json() as SpaceTask[])
        setLoading(false)
      }
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
    setConfirmDelete(false)
    setEditOpen(true)
  }

  // ── Handlers ──

  const parseMemories = async (res: Response): Promise<Memory[]> => {
    const raw = await res.json() as Record<string, unknown>[]
    return raw.map(d => ({
      id: String(d._id ?? ''), title: String(d.title ?? ''), date: String(d.date ?? ''),
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
    setSpaceNotes(prev => prev.filter(n => n._id !== noteId))
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
          setSpaceTasks(prev => [...prev, created])
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
    setSpaceTasks(prev => prev.map(t => t._id === task._id ? { ...t, done: !t.done } : t))
    await authFetch(`/api/sprint/tasks/${task._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !task.done }),
    })
  }

  const handleDeleteTask = async (taskId: string) => {
    setSpaceTasks(prev => prev.filter(t => t._id !== taskId))
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
        await updateSpace(space.id, {
          name:  editName.trim(),
          emoji: editEmoji.trim() || undefined,
          color: editColor,
          type:  editType,
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

  const handleDelete = async () => {
    if (!space) return
    await deleteSpace(space.id)
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
  const colorVar = { '--space-color': space?.color ?? 'var(--accent)' } as React.CSSProperties
  const isOwner = space?.ownerId === myId

  return (
    <div className={styles.root}>
      <AppHeader />

      {/* ── Hero ── */}
      <div className={styles.hero} style={colorVar}>
        <div className={styles.heroAccent} />
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Назад">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4l-5 5 5 5"/>
          </svg>
        </button>
        {loading ? (
          <div className={styles.heroSkeleton} />
        ) : (
          <>
            <span className={styles.heroEmoji}>{space?.emoji || '🌐'}</span>
            <div className={styles.heroInfo}>
              <h1 className={styles.heroName}>{space?.name}</h1>
              <span className={styles.heroType} style={colorVar}>
                {ctx.typeLabel || space?.type}
              </span>
              {ctx.description && <p className={styles.heroDesc}>{ctx.description}</p>}
            </div>
            {isOwner && (
              <button type="button" className={styles.editBtn} onClick={openEdit} aria-label="Редагувати простір">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z"/>
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Overview ── */}
      <div className={styles.overview}>
        {[
          { num: memories.length,    label: 'спогадів'  },
          { num: plans.length,       label: 'планів'    },
          { num: spaceTasks.length,  label: 'задач'     },
          { num: space?.members.length ?? 0, label: 'учасників' },
        ].map((item, i, arr) => (
          <React.Fragment key={item.label}>
            <div className={styles.overviewItem}>
              <span className={styles.overviewNum}>{loading ? '—' : item.num}</span>
              <span className={styles.overviewLabel}>{item.label}</span>
            </div>
            {i < arr.length - 1 && <div className={styles.overviewDivider} />}
          </React.Fragment>
        ))}
      </div>

      {/* ── Quick actions ── */}
      <div className={styles.actions}>
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={() => setAddMemOpen(true)}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
          {ctx.memBtnLabel.replace('+ ', '')}
        </button>
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={() => setAddPlanOpen(true)}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
          {ctx.planBtnLabel.replace('+ ', '')}
        </button>
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={handleOpenNoteInput}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
          Нотатка
        </button>
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={handleOpenTaskInput}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>
          {ctx.taskBtnLabel.replace('+ ', '')}
        </button>
      </div>

      <div className={styles.content}>

        {/* ── Members ── */}
        {!loading && (
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
          {loading ? (
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
          {loading ? (
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

          {loading ? (
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

          {loading ? (
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
                <div key={t._id} className={`${styles.spaceTask} ${t.done ? styles.spaceTaskDone : ''}`}>
                  <button
                    type="button"
                    className={styles.taskCheckbox}
                    style={t.done ? { '--space-color': space?.color ?? 'var(--accent)' } as React.CSSProperties : undefined}
                    onClick={() => handleToggleTask(t)}
                    aria-label={t.done ? 'Позначити незроблено' : 'Позначити зроблено'}
                  >
                    {t.done && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M1.5 5l2.5 2.5 4.5-4"/>
                      </svg>
                    )}
                  </button>
                  <span className={styles.taskTitle}>{t.title}</span>
                  <button
                    type="button"
                    className={styles.taskDeleteBtn}
                    onClick={() => handleDeleteTask(t._id)}
                    aria-label="Видалити задачу"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Modals ── */}
      <AddMemoryModal isOpen={addMemOpen} onClose={() => setAddMemOpen(false)} onCreate={handleAddMemory} initialSpaceId={spaceId} />
      {addPlanOpen && <PlanForm onClose={() => setAddPlanOpen(false)} onSubmit={handleAddPlan} initialSpaceId={spaceId} />}

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

            <label className={styles.fieldLabel}>EMOJI</label>
            <input
              className={`${styles.fieldInput} ${styles.fieldInputEmoji}`}
              value={editEmoji}
              onChange={e => setEditEmoji(e.target.value)}
              placeholder="🌐"
              maxLength={4}
            />

            <label className={styles.fieldLabel}>ТИП</label>
            <PillSelector
              options={TYPE_OPTIONS}
              value={editType}
              onChange={v => setEditType(v as SpaceType)}
            />

            <label className={styles.fieldLabel}>КОЛІР</label>
            <div className={styles.colorRow}>
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.colorDot} ${editColor === c ? styles.colorDotOn : ''}`}
                  style={{ background: c }}
                  onClick={() => setEditColor(c)}
                  aria-label={c}
                />
              ))}
            </div>

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
