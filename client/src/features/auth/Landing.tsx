import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import MimirFillIcon from '@/shared/components/ui/MimirFillIcon'
import styles from './Landing.module.css'

const CHAOS_ITEMS = ['Нотатки', 'Фото', 'Календар', 'Банківські витрати', 'Список справ', 'Фільми й книги', 'Десь у голові…']

const HERO_PARTICLES = [
  { x: -70, delay: 0,    dur: 6.5 },
  { x: -28, delay: 1.4,  dur: 7.2 },
  { x: 0,   delay: 2.6,  dur: 6.8 },
  { x: 34,  delay: 0.7,  dur: 7.6 },
  { x: 74,  delay: 3.4,  dur: 6.2 },
]

const LIFE_SPACES = [
  { title: 'Я', desc: "Думки, звички, цілі, здоров'я та особиста пам'ять." },
  { title: "Сім'я / пара", desc: "Спільні події, витрати, плани й речі, які не варто втрачати." },
  { title: 'Компанія / друзі', desc: "Спільні плани, витрати в складчину й моменти, які варто пам'ятати разом." },
  { title: 'Подорож або проєкт', desc: "Люди, місця, квитки, рішення й витрати в одному контексті. Усе, що складається в одну історію." },
]

const CYCLE_STEPS = [
  { title: 'Створи простір',        desc: 'Для себе, сім\'ї, подорожі або проєкту.' },
  { title: 'Додавай події',         desc: 'Нотатки, фото, витрати, місця, людей і плани.' },
  { title: "MIMIR пов'язує контекст", desc: 'Показує, що, коли, де і з ким відбувалося.' },
  { title: 'Повертайся до цілого',  desc: 'Не до окремої нотатки, а до історії навколо неї.' },
]

const INTERFACE_ITEMS = [
  { title: 'Дашборд (огляд дня)',        src: '/screenshot/dashboard.png' },
  { title: 'Створення Space',            src: '/screenshot/space.png' },
  { title: 'Додавання Memory',            src: '/screenshot/memory.png' },
  { title: 'Мімір у релевантний момент',  src: '/screenshot/mimir.png' },
]

const PRIVACY_POINTS = [
  'Особисті дані бачиш лише ти. Спільні дані бачать тільки учасники відповідного простору',
  'Паролі не зберігаються у відкритому вигляді',
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
        <div className={styles.heroRipples} aria-hidden="true">
          <span className={styles.heroRipple} style={{ animationDelay: '0s' } as React.CSSProperties} />
          <span className={styles.heroRipple} style={{ animationDelay: '1.5s' } as React.CSSProperties} />
          <span className={styles.heroRipple} style={{ animationDelay: '3s' } as React.CSSProperties} />
        </div>
        <div className={styles.heroParticles} aria-hidden="true">
          {HERO_PARTICLES.map((p, i) => (
            <span
              key={i}
              className={styles.heroParticle}
              style={{ '--x': `${p.x}px`, '--delay': `${p.delay}s`, '--dur': `${p.dur}s` } as React.CSSProperties}
            />
          ))}
        </div>
        <div className={styles.heroRing} aria-hidden="true" />
        <h1 className={styles.heroTitle}>MIMIR</h1>
        <p className={styles.heroKicker}>A memory system for your life</p>
        <p className={styles.heroFormula}>Thought finds the path. Memory gives it meaning.<span className={styles.heroFormulaAccent}>Drink deep.</span></p>
        <p className={styles.heroDesc}>
          MIMIR пов'язує події, людей, місця, витрати й думки, щоб ти повертався
          не до окремих записів, а до цілісної картини свого життя.
        </p>
        <Link to="/register" className={styles.heroCta}>
          Створити свій простір <span className={styles.heroCtaArrow} aria-hidden="true">→</span>
        </Link>
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
            <p className={styles.chaosConclusion}>
              Нотатки пам'ятають текст. Календар пам'ятає дату. Банк пам'ятає витрату.
              Але жоден із них не пам'ятає, як усе це було пов'язано.
            </p>
          </div>

          <div className={styles.blockPlain}>
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
            <p className={styles.mascotBubble}>
              Три простори чи тридцять три — я запам'ятаю зв'язки в кожному.
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className={`${styles.section} ${styles.reveal} ${styles.cycleSection}`}>
        <div className={styles.cornerMascotWrap}>
          <p className={styles.cornerMascotBubble}>
            Ти ще не з нами? Погнали у подорож під назвою життя.
          </p>
          <img
            src="/mimir/mimir-excited.webp"
            alt=""
            aria-hidden="true"
            className={styles.cornerMascot}
          />
        </div>
        <p className={styles.eyebrow}>◆ Як працює MIMIR</p>
        <div className={styles.cycle}>
          {CYCLE_STEPS.map((step, i) => (
            <div key={step.title} className={styles.cycleStep}>
              <span className={styles.cycleNum}>{String(i + 1).padStart(2, '0')}</span>
              <div className={styles.cycleBody}>
                <span className={styles.cycleTitle}>{step.title}</span>
                <span className={styles.cycleText}>{step.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Real interface (placeholders — real screenshots later) ── */}
      <section className={`${styles.section} ${styles.reveal}`}>
        <p className={styles.eyebrow}>◆ Реальний інтерфейс</p>
        <h2 className={styles.sectionTitle}>Не мокапи. Справжній продукт.</h2>
        <div className={styles.interfaceGrid}>
          {INTERFACE_ITEMS.map(item => (
            <div key={item.title} className={styles.interfaceFrame}>
              <img src={item.src} alt={item.title} className={styles.interfaceFrameImg} loading="lazy" />
              <span className={styles.interfaceFrameLabel}>{item.title}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Who is Mimir ── */}
      <section className={`${styles.section} ${styles.mimirSection} ${styles.reveal}`}>
        <MimirFillIcon progress={1} size={96} />
        <p className={styles.eyebrow}>◆ Хто такий Мімір</p>
        <h2 className={styles.sectionTitle}>Не асистент над твоїм життям. Пам'ять поруч із ним.</h2>
        <p className={styles.mimirText}>
          Мімір не вирішує за тебе. Він зберігає зв'язки між подіями, людьми, місцями,
          витратами й думками — щоб ти міг повернутися до повної картини.
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
      <section className={`${styles.section} ${styles.reveal}`}>
        <p className={styles.eyebrow}>◆ Почати</p>
        <h2 className={styles.sectionTitle}>Твій простір готовий</h2>
        <p className={styles.mimirText}>
          Створення акаунта займає хвилину. Після цього ти створюєш перший простір
          і додаєш першу пам'ять.
        </p>
        <div className={styles.ctaButtons}>
          <Link to="/register" className={styles.ctaPrimary}>Створити акаунт</Link>
          <Link to="/login" className={styles.ctaSecondary}>Увійти</Link>
        </div>
        <p className={styles.ctaNote}>Безкоштовний старт. Карта не потрібна.</p>
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
