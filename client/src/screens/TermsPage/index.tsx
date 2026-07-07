import React from 'react'
import { Link } from 'react-router-dom'
import styles from './TermsPage.module.css'

/**
 * TermsPage
 * ---------
 * Публічна сторінка Умов користування MIMIR.
 * Доступна без авторизації. Standalone layout без AppHeader/BottomNav.
 */
const TermsPage: React.FC = () => (
  <div className={styles.root}>
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>MIMIR</Link>
      <span className={styles.draft}>Чернетка · не перевірена юристом</span>
    </header>

    <main className={styles.content}>
      <h1 className={styles.title}>Умови користування</h1>
      <p className={styles.meta}>Редакція від 1 липня 2026 р.</p>

      <section className={styles.section}>
        <h2 className={styles.h2}>1. Що таке MIMIR</h2>
        <p>MIMIR — персональний органайзер і "Memory OS" для організації вашого цифрового та реального життя. Застосунок дозволяє зберігати спогади, фінансові записи, звички, рецепти, нотатки, плани та інший особистий контент.</p>
        <p>MIMIR розробляється як незалежний проєкт. Сервіс надається "як є" без гарантій безперебійної роботи.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>2. Акаунт і відповідальність користувача</h2>
        <p>Ви несете відповідальність за безпеку свого акаунту, включаючи пароль та PIN-код. Не передавайте облікові дані третім особам.</p>
        <p>Ви погоджуєтеся використовувати MIMIR лише в законних цілях і не завантажувати контент, що порушує права інших або чинне законодавство.</p>
        <p>Ви повинні бути не молодше 16 років для використання сервісу.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>3. Контент користувача</h2>
        <p>Весь контент, який ви додаєте (спогади, фото, нотатки, транзакції тощо), залишається вашою власністю. Ви надаєте MIMIR обмежену ліцензію на зберігання та відображення цього контенту виключно для забезпечення роботи сервісу.</p>
        <p>Ви відповідаєте за законність завантаженого контенту. Забороняється завантажувати матеріали, що порушують авторські права, містять незаконний контент або персональні дані третіх осіб без їх згоди.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>4. AI-функції</h2>
        <p>MIMIR містить функції на основі штучного інтелекту (AI-чат, AI-шеф, аналіз фінансів, розпізнавання чеків, генерація рецептів). Ці функції носять виключно допоміжний характер і <strong>не є</strong> фінансовою, медичною, юридичною або іншою професійною порадою.</p>
        <p>AI-відповіді можуть містити неточності. Приймайте рішення на основі власного судження.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>5. Підписка та оплата</h2>
        <p>Базовий план MIMIR є безкоштовним. Платні плани (Personal Memory, Shared Life, Family Chronicle) будуть доступні найближчим часом через платіжну платформу Paddle.</p>
        <p>Деталі ціноутворення, умови скасування та повернення коштів будуть описані окремо при запуску білінгу. Підписку можна буде скасувати в будь-який момент.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>6. Доступність сервісу</h2>
        <p>MIMIR прагне забезпечити максимальний uptime, але не гарантує безперебійну роботу. Сервіс може бути недоступний через технічні роботи, форс-мажорні обставини або збої інфраструктури.</p>
        <p>Ми залишаємо за собою право змінювати або припиняти окремі функції з попереднім повідомленням.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>7. Обмеження відповідальності</h2>
        <p>MIMIR не несе відповідальності за втрату даних, прямі або непрямі збитки, що виникли внаслідок використання або неможливості використання сервісу.</p>
        <p>Максимальна відповідальність MIMIR обмежена сумою, сплаченою вами за останні 3 місяці підписки.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>8. Зміни умов</h2>
        <p>Ми можемо змінювати ці умови. При суттєвих змінах ми повідомимо вас через застосунок або email щонайменше за 14 днів. Продовження використання після набрання змін чинності означає прийняття нових умов.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>9. Контакт</h2>
        <p>З питань щодо умов користування звертайтесь: <a href="mailto:support@mimir-hud.tech" className={styles.link}>support@mimir-hud.tech</a></p>
      </section>
    </main>

    <footer className={styles.footer}>
      <Link to="/privacy" className={styles.footerLink}>Політика конфіденційності</Link>
      <span className={styles.footerSep}>·</span>
      <Link to="/" className={styles.footerLink}>Повернутись до MIMIR</Link>
    </footer>
  </div>
)

export default TermsPage
