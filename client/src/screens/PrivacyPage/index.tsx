import React from 'react'
import { Link } from 'react-router-dom'
import styles from './PrivacyPage.module.css'

/**
 * PrivacyPage
 * -----------
 * Публічна сторінка Політики конфіденційності MIMIR.
 * Доступна без авторизації. Standalone layout без AppHeader/BottomNav.
 */
const PrivacyPage: React.FC = () => (
  <div className={styles.root}>
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>MIMIR</Link>
      <span className={styles.draft}>Чернетка · не перевірена юристом</span>
    </header>

    <main className={styles.content}>
      <h1 className={styles.title}>Політика конфіденційності</h1>
      <p className={styles.meta}>Редакція від 1 липня 2026 р.</p>

      <section className={styles.section}>
        <h2 className={styles.h2}>1. Що ми збираємо та навіщо</h2>
        <p>MIMIR — це Memory OS для особистого використання. Ми збираємо лише ті дані, які ви самі вводите або дозволяєте зібрати.</p>

        <h3 className={styles.h3}>Акаунт та автентифікація</h3>
        <p>Email (опційно), ім'я, username, хеш пароля (bcrypt), PIN-хеш (bcrypt, опційно). Google OAuth: ми отримуємо ваш Google ID та email для зв'язку з акаунтом — пароль Google ніколи не потрапляє до нас. JWT-токени для сесії (access 15 хв, refresh 30 днів у httpOnly cookie).</p>

        <h3 className={styles.h3}>Особистий контент</h3>
        <p>Спогади (текст, місця, дати, теги, фото), плани подорожей, нотатки, настрій (score 1–5 + нотатки), звички та завдання, рецепти, список перегляду медіа, регулярні платежі.</p>

        <h3 className={styles.h3}>Фінансові дані</h3>
        <p>Транзакції доходів і витрат (сума, опис, категорія, дата). Якщо ви підключаєте Monobank — ми отримуємо токен доступу до ваших транзакцій і зберігаємо його в зашифрованому вигляді (AES-256-GCM).</p>

        <h3 className={styles.h3}>Геодані</h3>
        <p>Координати місць, які ви додаєте до спогадів і планів. Місто профілю (для погоди). Ми не відстежуємо ваше місцезнаходження у фоновому режимі.</p>

        <h3 className={styles.h3}>Спільні дані (Family / Spaces)</h3>
        <p>Якщо ви використовуєте сімейні зв'язки або спільні простори, ваші спогади, позначені "спільними", можуть бути видимі пов'язаним учасникам згідно з налаштуваннями.</p>

        <h3 className={styles.h3}>AI-запити</h3>
        <p>Запити до AI-чату, шеф-асистента, фінансового аналізу та сканування чеків передаються через наш бекенд до Anthropic API. Самі AI-діалоги <strong>не зберігаються</strong> у нашій базі даних — вони є транзитними.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>2. Треті сторони та підпроцесори</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Сервіс</th>
              <th>Мета</th>
              <th>Дані</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>MongoDB Atlas</td><td>База даних</td><td>Всі персональні дані</td></tr>
            <tr><td>Cloudinary</td><td>Зберігання фото</td><td>Завантажені зображення</td></tr>
            <tr><td>Mapbox</td><td>Карти та геокодинг</td><td>Координати місць</td></tr>
            <tr><td>Anthropic</td><td>AI-функції</td><td>Текст запитів (транзитно)</td></tr>
            <tr><td>Resend</td><td>Email-верифікація</td><td>Email-адреса</td></tr>
            <tr><td>Monobank</td><td>Банківська інтеграція</td><td>Зашифрований токен доступу</td></tr>
            <tr><td>Vercel</td><td>Хостинг фронтенду</td><td>Логи запитів</td></tr>
            <tr><td>Railway</td><td>Хостинг бекенду</td><td>Логи запитів</td></tr>
            <tr><td>Paddle</td><td>Обробка платежів (незабаром)</td><td>Платіжна інформація</td></tr>
          </tbody>
        </table>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>3. Як ми зберігаємо та захищаємо дані</h2>
        <p>Паролі зберігаються виключно у вигляді bcrypt-хешу. Токени Monobank шифруються AES-256-GCM перед збереженням. З'єднання між клієнтом і сервером — тільки HTTPS. Refresh-токени зберігаються у httpOnly Secure cookie та хешуються в базі даних.</p>
        <p>Ми не продаємо ваші дані третім особам і не використовуємо їх для реклами.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>4. Ваші права (GDPR)</h2>
        <p>Як користувач, ви маєте право на:</p>
        <ul className={styles.list}>
          <li><strong>Доступ:</strong> перегляд і управління вашими даними через застосунок.</li>
          <li><strong>Портабельність:</strong> експорт усіх ваших даних у форматі JSON через Профіль → Налаштування.</li>
          <li><strong>Видалення:</strong> запит на видалення акаунту через Профіль → Налаштування. Дані зберігаються 30 днів після запиту, після чого видаляються безповоротно.</li>
          <li><strong>Виправлення:</strong> редагування профілю та будь-якого контенту безпосередньо в застосунку.</li>
          <li><strong>Заперечення:</strong> зверніться до нас для будь-яких питань щодо обробки даних.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>5. Cookies та сесії</h2>
        <p>Ми використовуємо один httpOnly cookie (<code className={styles.code}>rt</code>) для зберігання refresh-токена. Ніяких маркетингових, аналітичних або третьосторонніх cookies ми не встановлюємо.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>6. Діти</h2>
        <p>MIMIR не призначений для осіб молодше 16 років. Ми свідомо не збираємо дані дітей. Якщо ви вважаєте, що дитина зареєструвалась у сервісі — зверніться до нас для видалення акаунту.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>7. Зміни політики</h2>
        <p>При суттєвих змінах ми повідомимо вас через застосунок або email щонайменше за 14 днів до набрання змін чинності.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>8. Контакт</h2>
        <p>З питань конфіденційності звертайтесь: <a href="mailto:support@mimir-hud.tech" className={styles.link}>support@mimir-hud.tech</a></p>
      </section>
    </main>

    <footer className={styles.footer}>
      <Link to="/terms" className={styles.footerLink}>Умови користування</Link>
      <span className={styles.footerSep}>·</span>
      <Link to="/" className={styles.footerLink}>Повернутись до MIMIR</Link>
    </footer>
  </div>
)

export default PrivacyPage
