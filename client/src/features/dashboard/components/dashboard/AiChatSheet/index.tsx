import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { useModalHistory } from '@/shared/hooks/useModalHistory'
import { getToken } from '@/shared/services/api'
import MimirIcon from '@/shared/components/ui/MimirIcon'
import styles from './AiChatSheet.module.css'

const MIMIR_EMPTY_SRC   = '/mimir/mimir-idle.png'
const MIMIR_THINKING_SRC = '/mimir/mimir-thinking.png'

/**
 * AiChatSheet
 * -----------
 * Bottom-sheet AI асистент MIMIR. Streaming відповіді через SSE.
 * Розпізнає домен питання (фінанси/задачі/рецепти/медіа) і підвантажує контекст.
 * Підтримує AI-дії: створення нотаток і квестів через природну мову.
 *
 * Props:
 * @prop {boolean}    isOpen  — видимість шіта
 * @prop {() => void} onClose — callback закриття
 */
interface AiChatSheetProps {
  isOpen: boolean
  onClose: () => void
}

interface ActionResult {
  type: 'note' | 'quest'
  id: string
  title: string
}

interface Message {
  id: string
  role: 'user' | 'ai'
  text: string
  streaming?: boolean
  action?: ActionResult
}

const SUGGESTIONS = [
  'Скільки витратив цього місяця?',
  'Які задачі на сьогодні?',
  'Що приготувати з куркою?',
  'Що зараз дивлюся?',
]

// ── Action chip icons ─────────────────────────────────────────────────────────

const NoteIcon: React.FC = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M8.5 1.5L10.5 3.5L3.5 10.5H1.5V8.5L8.5 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M7 3L9 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const QuestIcon: React.FC = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2 1.5v9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M2 2.5h7L7.5 5.5H2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// ── Main component ─────────────────────────────────────────────────────────────

const AiChatSheet: React.FC<AiChatSheetProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [busy, setBusy]         = useState(false)
  const [mounted, setMounted]   = useState(false)
  const [visible, setVisible]   = useState(false)

  const sheetRef   = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const abortRef   = useRef<AbortController | null>(null)

  useSwipeToDismiss(onClose, { enabled: mounted, bodyRef, overlayRef, sheetRef })
  useModalHistory(onClose, isOpen)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    if (visible) setTimeout(() => inputRef.current?.focus(), 350)
  }, [visible])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busy) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: trimmed }
    const aiId = (Date.now() + 1).toString()
    const aiMsg: Message   = { id: aiId, role: 'ai', text: '', streaming: true }

    setMessages(prev => [...prev, userMsg, aiMsg])
    setInput('')
    setBusy(true)

    const token = getToken()
    const ctrl  = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: trimmed }),
        signal: ctrl.signal,
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()

          if (payload.startsWith('[ACTION:')) {
            try {
              const action = JSON.parse(payload.slice(8, -1)) as ActionResult
              setMessages(prev => prev.map(m =>
                m.id === aiId ? { ...m, action } : m
              ))
            } catch { /* skip malformed action */ }
            continue
          }

          if (payload === '[DONE]') break

          if (payload.startsWith('[ERROR]')) {
            setMessages(prev => prev.map(m =>
              m.id === aiId ? { ...m, text: 'Помилка відповіді. Спробуй ще раз.', streaming: false } : m
            ))
            break
          }

          try {
            const chunk = JSON.parse(payload) as string
            setMessages(prev => prev.map(m =>
              m.id === aiId ? { ...m, text: m.text + chunk } : m
            ))
          } catch { /* skip */ }
        }
      }

      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, streaming: false } : m))
    } catch (e: unknown) {
      if ((e as Error).name === 'AbortError') return
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, text: 'Не вдалось зʼєднатись. Спробуй ще.', streaming: false } : m
      ))
    } finally {
      setBusy(false)
    }
  }, [busy])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  if (!mounted) return null

  return (
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${visible ? styles.overlayVisible : ''}`}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${visible ? styles.sheetVisible : ''}`}
      >
        {/* Handle */}
        <div className={styles.handle} />

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <MimirIcon size={15} />
            <span className={styles.headerTitle}>MIMIR</span>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div ref={bodyRef} className={styles.body}>
          {messages.length === 0 ? (
            <div className={styles.empty}>
              <img src={MIMIR_EMPTY_SRC} alt="Mimir" className={styles.emptyMimir} draggable={false} />
              <p className={styles.emptyText}>Я допоможу знайти відповідь у твоїх фінансах,<br/>задачах, рецептах і медіа.</p>
              <div className={styles.suggestions}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    className={styles.suggestionChip}
                    onClick={() => sendMessage(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={`${styles.bubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleAi}`}
              >
                {msg.streaming && !msg.text
                  ? <img src={MIMIR_THINKING_SRC} alt="думає…" className={styles.thinkingMimir} draggable={false} />
                  : msg.text || ''
                }
                {msg.streaming && msg.text && <span className={styles.cursor} />}

                {msg.action && !msg.streaming && (
                  <div className={styles.actionChip}>
                    <span className={styles.actionIcon}>
                      {msg.action.type === 'note' ? <NoteIcon /> : <QuestIcon />}
                    </span>
                    <span className={styles.actionLabel}>
                      {msg.action.type === 'note' ? 'Нотатку збережено' : 'Квест додано'}
                    </span>
                    <span className={styles.actionTitle}>{msg.action.title}</span>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className={styles.inputRow}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Запитай щось..."
            rows={1}
            disabled={busy}
          />
          <button
            type="button"
            className={`${styles.sendBtn} ${(busy || !input.trim()) ? styles.sendBtnDisabled : ''}`}
            onClick={() => sendMessage(input)}
            disabled={busy || !input.trim()}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default AiChatSheet
