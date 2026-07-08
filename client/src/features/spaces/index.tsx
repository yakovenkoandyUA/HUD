import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppHeader from '@/shared/components/layout/AppHeader'
import { useSpacesStore, type Space } from '@/features/memories/store/spacesStore'
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

interface SpaceCtx {
  typeLabel:      string
  description:    string
  memBtnLabel:    string
  planBtnLabel:   string
  noteBtnLabel:   string
  memEmptyTitle:  string
  memEmptyDesc:   string
  planEmptyTitle: string
  planEmptyDesc:  string
  noteEmptyTitle: string
  noteEmptyDesc:  string
}

const SPACE_CONTEXT: Record<string, SpaceCtx> = {
  personal: {
    typeLabel:      'Особисте',
    description:    'Твій особистий простір — спогади, плани й думки тільки для тебе.',
    memBtnLabel:    '+ Спогад',
    planBtnLabel:   '+ План',
    noteBtnLabel:   '+ Нотатка',
    memEmptyTitle:  'Спогадів ще немає',
    memEmptyDesc:   'Додай особистий момент — щось що хочеш запам\'ятати.',
    planEmptyTitle: 'Планів ще немає',
    planEmptyDesc:  'Запиши ціль або щось що хочеш зробити.',
    noteEmptyTitle: 'Нотаток ще немає',
    noteEmptyDesc:  'Записуй думки, ідеї або що хочеш не забути.',
  },
  shared: {
    typeLabel:      'Спільне',
    description:    'Спільний простір для людей, речей і планів що вас об\'єднують.',
    memBtnLabel:    '+ Спільний спогад',
    planBtnLabel:   '+ Спільний план',
    noteBtnLabel:   '+ Нотатка',
    memEmptyTitle:  'Спогадів ще немає',
    memEmptyDesc:   'Додай перший спільний момент.',
    planEmptyTitle: 'Планів ще немає',
    planEmptyDesc:  'Запиши першу спільну ідею або план.',
    noteEmptyTitle: 'Нотаток ще немає',
    noteEmptyDesc:  'Залишай короткі записи для спільного контексту.',
  },
  trip: {
    typeLabel:      'Поїздка',
    description:    'Збирай тут плани, спогади, місця й враження цієї поїздки — до, під час і після.',
    memBtnLabel:    '+ Момент поїздки',
    planBtnLabel:   '+ Ідея маршруту',
    noteBtnLabel:   '+ Нотатка',
    memEmptyTitle:  'Спогадів ще немає',
    memEmptyDesc:   'Додай перший момент з цієї поїздки: фото, коротку історію або місце.',
    planEmptyTitle: 'Планів ще немає',
    planEmptyDesc:  'Запиши маршрут, ідею, бронювання або щось що хочеш не забути.',
    noteEmptyTitle: 'Нотаток ще немає',
    noteEmptyDesc:  'Адреси, рекомендації, що подивитись, де поїсти — все тут.',
  },
  family: {
    typeLabel:      'Сім\'я',
    description:    'Спільний простір для сімейних спогадів, планів і важливих моментів.',
    memBtnLabel:    '+ Сімейний спогад',
    planBtnLabel:   '+ Сімейний план',
    noteBtnLabel:   '+ Нотатка',
    memEmptyTitle:  'Спогадів ще немає',
    memEmptyDesc:   'Додай перший сімейний момент — фото, подія або просто що трапилось.',
    planEmptyTitle: 'Планів ще немає',
    planEmptyDesc:  'Запиши ідею для спільного часу — поїздка, вечеря, традиція.',
    noteEmptyTitle: 'Нотаток ще немає',
    noteEmptyDesc:  'Сімейні нотатки, нагадування, списки — що завгодно.',
  },
  friends: {
    typeLabel:      'Друзі',
    description:    'Збирай тут спільні моменти, плани і що ще хочете зробити разом.',
    memBtnLabel:    '+ Спогад з друзями',
    planBtnLabel:   '+ Планую разом',
    noteBtnLabel:   '+ Нотатка',
    memEmptyTitle:  'Спогадів ще немає',
    memEmptyDesc:   'Збережи перший момент з цими людьми.',
    planEmptyTitle: 'Планів ще немає',
    planEmptyDesc:  'Запиши що хочете зробити разом — куди піти, що спробувати.',
    noteEmptyTitle: 'Нотаток ще немає',
    noteEmptyDesc:  'Ідеї, адреси, посилання — щоб нічого не загубити.',
  },
  hobby: {
    typeLabel:      'Хобі',
    description:    'Простір для занять, прогресу й важливих моментів із цього хобі.',
    memBtnLabel:    '+ Подія',
    planBtnLabel:   '+ Ціль',
    noteBtnLabel:   '+ Нотатка',
    memEmptyTitle:  'Подій ще немає',
    memEmptyDesc:   'Додай перший момент з цього хобі — тренування, виступ, досягнення.',
    planEmptyTitle: 'Цілей ще немає',
    planEmptyDesc:  'Постав ціль або заплануй наступний крок у цьому хобі.',
    noteEmptyTitle: 'Нотаток ще немає',
    noteEmptyDesc:  'Ідеї, референси, налаштування — фіксуй все що важливо.',
  },
  sports: {
    typeLabel:      'Спорт',
    description:    'Тренування, змагання, результати — всі спортивні моменти тут.',
    memBtnLabel:    '+ Результат',
    planBtnLabel:   '+ Тренування',
    noteBtnLabel:   '+ Нотатка',
    memEmptyTitle:  'Результатів ще немає',
    memEmptyDesc:   'Додай перше тренування, змагання або досягнення.',
    planEmptyTitle: 'Тренувань ще немає',
    planEmptyDesc:  'Заплануй наступне тренування або постав спортивну ціль.',
    noteEmptyTitle: 'Нотаток ще немає',
    noteEmptyDesc:  'Програми, техніки, PR-и — записуй що важливо.',
  },
  project: {
    typeLabel:      'Проєкт',
    description:    'Збирай тут задачі, нотатки й прогрес цього проєкту.',
    memBtnLabel:    '+ Milestone',
    planBtnLabel:   '+ Задача',
    noteBtnLabel:   '+ Нотатка',
    memEmptyTitle:  'Досягнень ще немає',
    memEmptyDesc:   'Фіксуй ключові моменти та досягнення проєкту.',
    planEmptyTitle: 'Задач ще немає',
    planEmptyDesc:  'Запиши першу задачу або ціль цього проєкту.',
    noteEmptyTitle: 'Нотаток ще немає',
    noteEmptyDesc:  'Рішення, думки, лінки, референси — все тут.',
  },
}

const DEFAULT_CTX: SpaceCtx = {
  typeLabel:      '',
  description:    '',
  memBtnLabel:    '+ Спогад',
  planBtnLabel:   '+ План',
  noteBtnLabel:   '+ Нотатка',
  memEmptyTitle:  'Спогадів ще немає',
  memEmptyDesc:   'Додай перший спогад у цей простір.',
  planEmptyTitle: 'Планів ще немає',
  planEmptyDesc:  'Запиши перший план або ціль.',
  noteEmptyTitle: 'Нотаток ще немає',
  noteEmptyDesc:  'Залишай короткі записи в цьому просторі.',
}

function formatNoteDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`
}

/**
 * SpaceDetailScreen
 * -----------------
 * Сторінка деталей простору: hero з описом, overview counts, учасники,
 * спогади, плани, нотатки. Quick actions і empty states — контекстні per type.
 */
const SpaceDetailScreen: React.FC = () => {
  const navigate = useNavigate()
  const { spaceId } = useParams<{ spaceId: string }>()
  const { spaces, fetchSpaces } = useSpacesStore()
  const { addMemory }  = useMemoriesStore()
  const { addPlan }    = usePlansStore()
  const { addNote, deleteNote } = useNotesStore()

  const [space, setSpace]           = useState<Space | null>(null)
  const [memories, setMemories]     = useState<Memory[]>([])
  const [plans, setPlans]           = useState<Plan[]>([])
  const [spaceNotes, setSpaceNotes] = useState<Note[]>([])
  const [loading, setLoading]       = useState(true)
  const [addMemOpen, setAddMemOpen]     = useState(false)
  const [addPlanOpen, setAddPlanOpen]   = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText]         = useState('')

  const noteTextareaRef = useRef<HTMLTextAreaElement>(null)
  const notesSectionRef = useRef<HTMLElement>(null)

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

      const [memRes, planRes, noteRes] = await Promise.all([
        authFetch(`/api/memories?spaceId=${spaceId}`),
        authFetch(`/api/plans?spaceId=${spaceId}`),
        authFetch(`/api/notes?spaceId=${spaceId}`),
      ])

      if (!cancelled) {
        if (memRes.ok) {
          const raw = await memRes.json() as Record<string, unknown>[]
          setMemories(raw.map(d => ({
            id:               String(d._id ?? ''),
            title:            String(d.title ?? ''),
            date:             String(d.date ?? ''),
            dateEnd:          (d.dateEnd as string | null) ?? null,
            isTrip:           Boolean(d.isTrip),
            coverUrl:         String(d.coverUrl ?? ''),
            coverAttribution: (d.coverAttribution as string | undefined),
            location:         (d.location as string | undefined),
            lat:              (d.lat as number | null) ?? null,
            lng:              (d.lng as number | null) ?? null,
            notes:            String(d.notes ?? ''),
            tags:             (d.tags as string[]) ?? [],
            photos:           [],
            places:           [],
            createdAt:        String(d.createdAt ?? ''),
            spaceId:          (d.spaceId as string | null) ?? null,
            withProfiles:     (d.withProfiles as string[]) ?? [],
          })))
        }
        if (planRes.ok) setPlans(await planRes.json() as Plan[])
        if (noteRes.ok) setSpaceNotes(await noteRes.json() as Note[])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId])

  // Auto-focus textarea when note input opens
  useEffect(() => {
    if (showNoteInput) noteTextareaRef.current?.focus()
  }, [showNoteInput])

  const refreshMemories = async () => {
    const res = await authFetch(`/api/memories?spaceId=${spaceId}`)
    if (res.ok) {
      const raw = await res.json() as Record<string, unknown>[]
      setMemories(raw.map(d => ({
        id: String(d._id ?? ''), title: String(d.title ?? ''), date: String(d.date ?? ''),
        dateEnd: (d.dateEnd as string | null) ?? null, isTrip: Boolean(d.isTrip),
        coverUrl: String(d.coverUrl ?? ''), coverAttribution: (d.coverAttribution as string | undefined),
        location: (d.location as string | undefined), lat: (d.lat as number | null) ?? null,
        lng: (d.lng as number | null) ?? null, notes: String(d.notes ?? ''),
        tags: (d.tags as string[]) ?? [], photos: [], places: [], createdAt: String(d.createdAt ?? ''),
        spaceId: (d.spaceId as string | null) ?? null, withProfiles: (d.withProfiles as string[]) ?? [],
      })))
    }
  }

  const handleAddMemory = async (data: AddMemoryData) => {
    await addMemory({ ...data, photos: [], spaceId: spaceId ?? null })
    await refreshMemories()
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
    // Scroll to notes section
    setTimeout(() => notesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const handleSaveNote = useCallback(async () => {
    const text = noteText.trim()
    if (!text) { setShowNoteInput(false); return }
    await addNote(text, spaceId)
    // Refresh space notes
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
              {ctx.description && (
                <p className={styles.heroDesc}>{ctx.description}</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Overview counts ── */}
      <div className={styles.overview}>
        <div className={styles.overviewItem}>
          <span className={styles.overviewNum}>{loading ? '—' : memories.length}</span>
          <span className={styles.overviewLabel}>спогадів</span>
        </div>
        <div className={styles.overviewDivider} />
        <div className={styles.overviewItem}>
          <span className={styles.overviewNum}>{loading ? '—' : plans.length}</span>
          <span className={styles.overviewLabel}>планів</span>
        </div>
        <div className={styles.overviewDivider} />
        <div className={styles.overviewItem}>
          <span className={styles.overviewNum}>{loading ? '—' : spaceNotes.length}</span>
          <span className={styles.overviewLabel}>нотаток</span>
        </div>
        <div className={styles.overviewDivider} />
        <div className={styles.overviewItem}>
          <span className={styles.overviewNum}>{loading ? '—' : (space?.members.length ?? 0)}</span>
          <span className={styles.overviewLabel}>учасників</span>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className={styles.actions}>
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={() => setAddMemOpen(true)}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 2v10M2 7h10"/>
          </svg>
          {ctx.memBtnLabel.replace('+ ', '')}
        </button>
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={() => setAddPlanOpen(true)}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 2v10M2 7h10"/>
          </svg>
          {ctx.planBtnLabel.replace('+ ', '')}
        </button>
        <button type="button" className={styles.actionBtn} style={colorVar} onClick={handleOpenNoteInput}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 2v10M2 7h10"/>
          </svg>
          Нотатка
        </button>
      </div>

      <div className={styles.content}>
        {/* ── Members ── */}
        {!loading && (space?.members?.length ?? 0) > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>УЧАСНИКИ</h2>
            <div className={styles.members}>
              {space!.members.map(m => (
                <div key={m.userId} className={styles.member}>
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} className={styles.memberAvatar} alt={m.name} />
                  ) : (
                    <span className={styles.memberInitial} style={colorVar}>{m.name[0]?.toUpperCase()}</span>
                  )}
                  <span className={styles.memberName}>{m.name}</span>
                  {m.role === 'owner' && <span className={styles.ownerBadge}>власник</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Memories ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>СПОГАДИ</h2>
          {loading ? (
            <div className={styles.memoriesGrid}>
              {[1,2,3,4].map(i => <div key={i} className={styles.skeleton} />)}
            </div>
          ) : memories.length === 0 ? (
            <div className={styles.empty}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" aria-hidden="true">
                <circle cx="16" cy="12" r="5"/><path d="M6 28c0-5.5 4.5-10 10-10s10 4.5 10 10"/>
              </svg>
              <p className={styles.emptyTitle}>{ctx.memEmptyTitle}</p>
              <p className={styles.emptyDesc}>{ctx.memEmptyDesc}</p>
              <button type="button" className={styles.emptyAction} style={colorVar} onClick={() => setAddMemOpen(true)}>
                {ctx.memBtnLabel}
              </button>
            </div>
          ) : (
            <div className={styles.memoriesGrid}>
              {memories.map(m => (
                <MemoryCard key={m.id} memory={m} onClick={() => navigate(`/memories/${m.id}`)} />
              ))}
            </div>
          )}
        </section>

        {/* ── Plans ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>ПЛАНИ</h2>
          {loading ? (
            <div className={styles.plansCol}>
              {[1,2].map(i => <div key={i} className={`${styles.skeleton} ${styles.skeletonPlan}`} />)}
            </div>
          ) : plans.length === 0 ? (
            <div className={styles.empty}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" aria-hidden="true">
                <rect x="6" y="8" width="20" height="18" rx="3"/>
                <path d="M11 14h10M11 19h7"/>
                <path d="M20 4v8M12 4v8"/>
              </svg>
              <p className={styles.emptyTitle}>{ctx.planEmptyTitle}</p>
              <p className={styles.emptyDesc}>{ctx.planEmptyDesc}</p>
              <button type="button" className={styles.emptyAction} style={colorVar} onClick={() => setAddPlanOpen(true)}>
                {ctx.planBtnLabel}
              </button>
            </div>
          ) : (
            <div className={styles.plansCol}>
              {plans.map(p => (
                <PlanCard key={p._id} plan={p} onClick={() => navigate(`/memories?plan=${p._id}`)} />
              ))}
            </div>
          )}
        </section>

        {/* ── Notes ── */}
        <section className={styles.section} ref={notesSectionRef}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>НОТАТКИ</h2>
            {!showNoteInput && (
              <button
                type="button"
                className={styles.sectionAddBtn}
                style={colorVar}
                onClick={handleOpenNoteInput}
                aria-label="Додати нотатку"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 2v10M2 7h10"/>
                </svg>
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
                <button
                  type="button"
                  className={styles.noteInputCancel}
                  onClick={() => { setShowNoteInput(false); setNoteText('') }}
                >
                  Скасувати
                </button>
                <button
                  type="button"
                  className={styles.noteInputSave}
                  style={colorVar}
                  onClick={handleSaveNote}
                  disabled={!noteText.trim()}
                >
                  Зберегти
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className={styles.plansCol}>
              {[1,2].map(i => <div key={i} className={`${styles.skeleton} ${styles.skeletonNote}`} />)}
            </div>
          ) : spaceNotes.length === 0 && !showNoteInput ? (
            <div className={styles.empty}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" aria-hidden="true">
                <path d="M8 6h16a2 2 0 0 1 2 2v18l-4-3H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>
                <path d="M11 13h10M11 18h6"/>
              </svg>
              <p className={styles.emptyTitle}>{ctx.noteEmptyTitle}</p>
              <p className={styles.emptyDesc}>{ctx.noteEmptyDesc}</p>
              <button type="button" className={styles.emptyAction} style={colorVar} onClick={handleOpenNoteInput}>
                {ctx.noteBtnLabel}
              </button>
            </div>
          ) : (
            <div className={styles.notesList}>
              {spaceNotes.map(n => (
                <div key={n._id} className={styles.spaceNote}>
                  <p className={styles.spaceNoteText}>{n.text}</p>
                  <div className={styles.spaceNoteMeta}>
                    <span className={styles.spaceNoteDate}>{formatNoteDate(n.updatedAt)}</span>
                    <button
                      type="button"
                      className={styles.spaceNoteDelete}
                      onClick={() => handleDeleteNote(n._id)}
                      aria-label="Видалити нотатку"
                    >
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
      </div>

      {/* ── Modals ── */}
      <AddMemoryModal
        isOpen={addMemOpen}
        onClose={() => setAddMemOpen(false)}
        onCreate={handleAddMemory}
        initialSpaceId={spaceId}
      />
      {addPlanOpen && (
        <PlanForm
          onClose={() => setAddPlanOpen(false)}
          onSubmit={handleAddPlan}
          initialSpaceId={spaceId}
        />
      )}
    </div>
  )
}

export default SpaceDetailScreen
