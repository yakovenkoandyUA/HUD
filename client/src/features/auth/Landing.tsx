import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import MimirFillIcon from '@/shared/components/ui/MimirFillIcon'
import styles from './Landing.module.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
const BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').trim()

const CHAOS_ITEMS = ['Нотатки', 'Фото', 'Календар', 'Банківські витрати', 'Список справ', 'Фільми й книги', 'Десь у голові…']

const LIFE_SPACES = [
  { title: 'Я', desc: 'Особистий простір — звички, цілі, нотатки, все що стосується лише тебе.' },
  { title: "Сім'я / пара", desc: 'Спільні спогади, витрати, плани — з тими, хто поруч.' },
  { title: 'Подорож або проєкт', desc: 'Квитки, місця, витрати, люди — все, що складає одну історію.' },
]

const CYCLE_STEPS = [
  'Створи Space',
  'Додавай події та памʼять',
  'MIMIR збирає контекст',
  'Повертайся осмислено',
]

const INTERFACE_ITEMS = [
  'Створення Space',
  'Додавання Memory',
  "Пов'язані люди, місця, витрати",
  'Yearbook та Timeline',
  'Мімір у релевантний момент',
]

const PRIVACY_POINTS = [
  'Ти бачиш свої дані — і тільки ті, хто в твоїх spaces, бачить спільне',
  'Дані зберігаються в зашифрованому вигляді, паролі — тільки як bcrypt-хеш',
  'Спільні простори видимі лише учасникам, яких ти сам додав',
  'Експорт і видалення даних — в один клік, будь-коли',
  'AI бачить лише те, що потрібно для відповіді — діалоги не зберігаються',
]

type FormStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Landing
 * -------
 * Публічна маркетингова сторінка на "/" для неавторизованих гостей
 * (RootRoute рендерить її замість Dashboard коли немає токена).
 * Структура за брифом Джонні: Hero → Проблема → Life Spaces → Як працює →
 * Реальний інтерфейс (заглушки) → Хто такий Мімір → Приватність → Форма в бету.
 */
const Landing: React.FC = () => {
  const formRef = useRef<HTMLDivElement>(null)

  const [name, setName]                 = useState('')
  const [email, setEmail]               = useState('')
  const [currentTools, setCurrentTools] = useState('')
  const [scenario, setScenario]         = useState('')
  const [consent, setConsent]           = useState(false)
  const [status, setStatus]             = useState<FormStatus>('idle')
  const [error, setError]               = useState('')

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // Reveal-on-scroll for section blocks
  useEffect(() => {
    const els = document.querySelectorAll(`.${styles.reveal}`)
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add(styles.revealIn) })
    }, { threshold: 0.15 })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !consent) return
    if (!EMAIL_RE.test(email.trim())) {
      setError('Невірний формат email')
      setStatus('error')
      return
    }
    setStatus('loading')
    setError('')
    try {
      const res = await fetch(`${BASE_URL}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), currentTools: currentTools.trim(), scenario: scenario.trim(), consent }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Помилка відправки')
      }
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка відправки')
      setStatus('error')
    }
  }

  return (
    <div className={styles.root}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <span className={styles.logo}>MIMIR</span>
        <Link to="/login" className={styles.loginLink}>Увійти</Link>
      </header>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroRing} aria-hidden="true" />
        <h1 className={styles.heroTitle}>MIMIR</h1>
        <p className={styles.heroKicker}>Memory OS for your life spaces</p>
        <p className={styles.heroDesc}>
          Збирай пам'ять, людей, події, плани й фінанси у простори власного життя.
        </p>
        <button type="button" className={styles.heroCta} onClick={scrollToForm}>
          Приєднатися до закритої бети
        </button>
        <p className={styles.heroFormula}>Thought finds the path. Memory gives it meaning. <span className={styles.heroFormulaAccent}>Drink deep.</span></p>
      </section>

      {/* ── Problem ── */}
      <section className={`${styles.section} ${styles.reveal}`}>
        <p className={styles.eyebrow}>◆ Проблема</p>
        <h2 className={styles.sectionTitle}>Твоє життя зберігається всюди.<br />Крім одного місця.</h2>
        <div className={styles.chaosCloud}>
          {CHAOS_ITEMS.map((item, i) => (
            <span key={item} className={styles.chaosChip} style={{ '--i': i } as React.CSSProperties}>{item}</span>
          ))}
        </div>
      </section>

      {/* ── Life Spaces ── */}
      <section className={`${styles.section} ${styles.reveal}`}>
        <p className={styles.eyebrow}>◆ Life Spaces</p>
        <h2 className={styles.sectionTitle}>Простори власного життя</h2>
        <div className={styles.spacesGrid}>
          {LIFE_SPACES.map(s => (
            <div key={s.title} className={styles.spaceCard}>
              <span className={styles.spaceCardTitle}>{s.title}</span>
              <p className={styles.spaceCardDesc}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className={`${styles.section} ${styles.reveal}`}>
        <p className={styles.eyebrow}>◆ Як працює MIMIR</p>
        <div className={styles.cycle}>
          {CYCLE_STEPS.map((step, i) => (
            <React.Fragment key={step}>
              <div className={styles.cycleStep}>
                <span className={styles.cycleNum}>{String(i + 1).padStart(2, '0')}</span>
                <span className={styles.cycleText}>{step}</span>
              </div>
              {i < CYCLE_STEPS.length - 1 && <span className={styles.cycleArrow} aria-hidden="true">→</span>}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ── Real interface (placeholders — real screenshots later) ── */}
      <section className={`${styles.section} ${styles.reveal}`}>
        <p className={styles.eyebrow}>◆ Реальний інтерфейс</p>
        <h2 className={styles.sectionTitle}>Не мокапи. Справжній продукт.</h2>
        <div className={styles.interfaceGrid}>
          {INTERFACE_ITEMS.map(item => (
            <div key={item} className={styles.interfaceFrame}>
              <div className={styles.interfaceFramePlaceholder}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <span>Скріншот скоро</span>
              </div>
              <span className={styles.interfaceFrameLabel}>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Who is Mimir ── */}
      <section className={`${styles.section} ${styles.mimirSection} ${styles.reveal}`}>
        <MimirFillIcon progress={1} size={96} />
        <p className={styles.eyebrow}>◆ Хто такий Мімір</p>
        <h2 className={styles.sectionTitle}>Не help-бот. Не Clippy у мантії.</h2>
        <p className={styles.mimirText}>
          Мімір не керує твоїм життям. Він допомагає не втрачати його контекст —
          провідник по твоїй пам'яті, просторах і рішеннях.
        </p>
      </section>

      {/* ── Privacy ── */}
      <section className={`${styles.section} ${styles.reveal}`}>
        <p className={styles.eyebrow}>◆ Приватність</p>
        <h2 className={styles.sectionTitle}>Пам'ять і фінанси — делікатні дані</h2>
        <ul className={styles.privacyList}>
          {PRIVACY_POINTS.map(p => (
            <li key={p} className={styles.privacyItem}>{p}</li>
          ))}
        </ul>
        <Link to="/privacy" className={styles.privacyLink}>Повна політика конфіденційності →</Link>
      </section>

      {/* ── Waitlist form ── */}
      <section className={`${styles.section} ${styles.reveal}`} ref={formRef}>
        <p className={styles.eyebrow}>◆ Закрита бета</p>
        <h2 className={styles.sectionTitle}>Приєднатися</h2>

        {status === 'success' ? (
          <div className={styles.formSuccess}>
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" />
              <path d="M14 24l7 7 13-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p>Заявку прийнято. Ми напишемо, коли відкриємо доступ.</p>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formRow}>
              <input
                className={styles.formInput}
                placeholder="ІМ'Я"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={status === 'loading'}
                required
              />
              <input
                className={styles.formInput}
                type="email"
                placeholder="EMAIL"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={status === 'loading'}
                required
              />
            </div>
            <input
              className={styles.formInput}
              placeholder="Що зараз використовуєш? (Notes, Google Calendar…)"
              value={currentTools}
              onChange={e => setCurrentTools(e.target.value)}
              disabled={status === 'loading'}
            />
            <textarea
              className={styles.formTextarea}
              placeholder="Який сценарій цікавить найбільше?"
              value={scenario}
              onChange={e => setScenario(e.target.value)}
              rows={3}
              disabled={status === 'loading'}
            />
            <label className={styles.formConsent}>
              <input
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                disabled={status === 'loading'}
                required
              />
              Погоджуюсь на участь у тестуванні та обробку email для запрошення в бету
            </label>

            {status === 'error' && <p className={styles.formError}>{error}</p>}

            <button
              type="submit"
              className={styles.formSubmit}
              disabled={status === 'loading' || !name.trim() || !email.trim() || !consent}
            >
              {status === 'loading' ? '▪▪▪' : 'ПРИЄДНАТИСЯ'}
            </button>
          </form>
        )}
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <p className={styles.footerFormula}>Thought finds the path. Memory gives it meaning. Drink deep.</p>
        <div className={styles.footerLinks}>
          <Link to="/terms" className={styles.footerLink}>Умови</Link>
          <span className={styles.footerSep}>·</span>
          <Link to="/privacy" className={styles.footerLink}>Конфіденційність</Link>
          <span className={styles.footerSep}>·</span>
          <Link to="/login" className={styles.footerLink}>Увійти</Link>
        </div>
      </footer>
    </div>
  )
}

export default Landing
