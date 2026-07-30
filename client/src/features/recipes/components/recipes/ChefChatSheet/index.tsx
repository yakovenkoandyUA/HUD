import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import { useModalHistory } from '@/shared/hooks/useModalHistory'
import { getToken } from '@/shared/services/api'
import MimirIcon from '@/shared/components/ui/MimirIcon'
import type { Recipe } from '@/shared/types'
import styles from './ChefChatSheet.module.css'

/**
 * ChefChatSheet
 * -------------
 * Bottom-sheet AI шеф-асистент для конкретного рецепту. Streaming відповіді
 * через SSE (`/api/ai/chef-chat`), контекст — інгредієнти/кроки/порції цього
 * рецепту. На відміну від RecipeGenerator (новий рецепт з нуля) — допомагає
 * з тим, що вже відкрито: заміна інгредієнтів, адаптація порцій/дієти, підказки.
 *
 * Props:
 * @prop {boolean}    isOpen  — видимість шіта
 * @prop {() => void} onClose — callback закриття
 * @prop {Recipe}     recipe  — рецепт, контекст для system prompt
 */
interface ChefChatSheetProps {
  isOpen: boolean
  onClose: () => void
  recipe: Recipe
}

interface Message {
  id: string
  role: 'user' | 'ai'
  text: string
  streaming?: boolean
}

const SUGGESTIONS = [
  'Чим можна замінити інгредієнти?',
  'Адаптуй на меншу кількість порцій',
  'Це підходить для кето-дієти?',
  'Що робити якщо щось пішло не так?',
]

const ChefChatSheet: React.FC<ChefChatSheetProps> = ({ isOpen, onClose, recipe }) => {
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

  useSwipeToDismiss(onClose, { enabled: isOpen, bodyRef, overlayRef, sheetRef })
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

  // Sticky-bottom auto-scroll: only follow new streamed content while the user
  // hasn't scrolled away from the bottom. Otherwise SSE chunks keep re-snapping
  // scrollTop to the bottom, which also traps swipe-to-dismiss (it only starts
  // a drag when the scrollable body is at scrollTop 0).
  const stickToBottomRef = useRef(true)

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const onScroll = () => {
      stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (stickToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (!isOpen) setMessages([])
  }, [isOpen])

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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/chef-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: trimmed,
          recipe: {
            title:        recipe.title,
            ingredients:  recipe.ingredients,
            instructions: recipe.instructions,
            steps:        recipe.steps,
            servings:     recipe.servings,
            difficulty:   recipe.difficulty,
            cookTime:     recipe.cookTime,
            calories:     recipe.calories,
          },
        }),
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
  }, [busy, recipe])

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
            <span className={styles.headerTitle}>ШЕФ · {recipe.title.toUpperCase()}</span>
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
              <div className={styles.emptyIcon}><MimirIcon size={28} /></div>
              <p className={styles.emptyText}>Запитай про заміну інгредієнтів,<br/>порції, дієту або процес готування.</p>
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
                {msg.text || (msg.streaming ? <span className={styles.cursor} /> : '')}
                {msg.streaming && msg.text && <span className={styles.cursor} />}
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
            placeholder="Запитай шефа..."
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

export default ChefChatSheet
