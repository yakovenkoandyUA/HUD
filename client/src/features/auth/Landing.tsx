import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import MimirFillIcon from '@/shared/components/ui/MimirFillIcon'
import styles from './Landing.module.css'

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

/**
 * Landing
 * -------
 * Публічна маркетингова сторінка на "/" для неавторизованих гостей
 * (RootRoute рендерить її замість Dashboard коли немає токена).
 * Структура за брифом Джонні: Hero → Проблема → Life Spaces → Як працює →
 * Реальний інтерфейс (заглушки) → Хто такий Мімір → Приватність → Почати (реєстрація).
 */
const Landing: React.FC = () => {
  const ctaRef = useRef<HTMLDivElement>(null)

  const scrollToCta = () => ctaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // Reveal-on-scroll for section blocks
  useEffect(() => {
    const els = document.querySelectorAll(`.${styles.reveal}`)
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add(styles.revealIn) })
    }, { threshold: 0.15 })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

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
        <p className={styles.heroFormula}>Thought finds the path. Memory gives it meaning. <span className={styles.heroFormulaAccent}>Drink deep.</span></p>
        <p className={styles.heroDesc}>
          Збирай пам'ять, людей, події, плани й фінанси у простори власного життя.
        </p>
        <button type="button" className={styles.heroCta} onClick={scrollToCta}>
          Почати
        </button>
      </section>

      {/* ── Problem + Life Spaces (two compact blocks side by side) ── */}
      <section className={`${styles.section} ${styles.reveal}`}>
        <div className={styles.twinBlocks}>
          <div className={styles.block}>
            <p className={styles.eyebrow}>◆ Проблема</p>
            <h2 className={styles.blockTitle}>Твоє життя зберігається всюди. Крім одного місця.</h2>
            <div className={styles.chaosCloud}>
              {CHAOS_ITEMS.map((item, i) => (
                <span key={item} className={styles.chaosChip} style={{ '--i': i } as React.CSSProperties}>{item}</span>
              ))}
            </div>
          </div>

          <div className={styles.block}>
            <p className={styles.eyebrow}>◆ Life Spaces</p>
            <h2 className={styles.blockTitle}>Простори власного життя</h2>
            <div className={styles.spacesList}>
              {LIFE_SPACES.map(s => (
                <div key={s.title} className={styles.spaceRow}>
                  <span className={styles.spaceRowTitle}>{s.title}</span>
                  <p className={styles.spaceRowDesc}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
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

      {/* ── Почати ── */}
      <section className={`${styles.section} ${styles.reveal}`} ref={ctaRef}>
        <p className={styles.eyebrow}>◆ Почати</p>
        <h2 className={styles.sectionTitle}>Твій простір готовий</h2>
        <p className={styles.mimirText}>
          Створи акаунт і почни збирати пам'ять власного життя вже зараз.
        </p>
        <div className={styles.ctaButtons}>
          <Link to="/register" className={styles.ctaPrimary}>Створити акаунт</Link>
          <Link to="/login" className={styles.ctaSecondary}>Увійти</Link>
        </div>
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
