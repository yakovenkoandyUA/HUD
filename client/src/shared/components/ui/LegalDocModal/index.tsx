import React, { useEffect, useRef, useState } from 'react'
import { useModalHistory } from '@/shared/hooks/useModalHistory'
import { useSwipeToDismiss } from '@/shared/hooks/useSwipeToDismiss'
import styles from './LegalDocModal.module.css'

/**
 * LegalDocModal
 * -------------
 * Bottom-sheet для відображення юридичних документів (Умови / Політика).
 * Кнопка «Ознайомився» заблокована поки не долистано до кінця.
 *
 * Props:
 * @prop {boolean}           isOpen
 * @prop {() => void}        onClose
 * @prop {() => void}        onConfirm   — спрацьовує коли юзер долистав і натиснув кнопку
 * @prop {'terms'|'privacy'} type
 */
interface LegalDocModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  type: 'terms' | 'privacy'
}

const ANIM_MS = 340

const LegalDocModal: React.FC<LegalDocModalProps> = ({ isOpen, onClose, onConfirm, type }) => {
  const [mounted, setMounted]   = useState(isOpen)
  const [visible, setVisible]   = useState(isOpen)
  const [hasReadAll, setHasReadAll] = useState(false)

  const overlayRef = useRef<HTMLDivElement>(null)
  const bodyRef    = useRef<HTMLDivElement>(null)

  const sheetRef = useSwipeToDismiss(onClose, { enabled: mounted, overlayRef, bodyRef })

  useModalHistory(onClose, isOpen)

  useEffect(() => {
    if (!mounted) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [mounted])

  useEffect(() => {
    if (isOpen) {
      setHasReadAll(false)
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), ANIM_MS)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // check if content fits without scrolling
  useEffect(() => {
    if (!mounted || !bodyRef.current) return
    const el = bodyRef.current
    const check = () => {
      if (el.scrollHeight <= el.clientHeight + 40) setHasReadAll(true)
    }
    const raf = requestAnimationFrame(check)
    return () => cancelAnimationFrame(raf)
  }, [mounted])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleScroll = () => {
    if (hasReadAll || !bodyRef.current) return
    const el = bodyRef.current
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
      setHasReadAll(true)
    }
  }

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  if (!mounted) return null

  return (
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${visible ? styles.overlayVisible : styles.overlayHidden}`}
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${visible ? styles.sheetVisible : styles.sheetHidden}`}
        onClick={e => e.stopPropagation()}
      >
        {/* drag handle */}
        <div className={styles.dragHandle}>
          <span className={styles.dragBar} />
        </div>

        {/* header */}
        <div className={styles.header}>
          <h3 className={styles.title}>
            {type === 'terms' ? 'Умови користування' : 'Політика конфіденційності'}
          </h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </div>

        {/* scrollable content */}
        <div ref={bodyRef} className={styles.body} onScroll={handleScroll}>
          {type === 'terms' ? <TermsContent /> : <PrivacyContent />}
        </div>

        {/* sticky footer */}
        <div className={styles.footer}>
          {!hasReadAll && (
            <p className={styles.scrollHint}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2v8M3 7l3 3 3-3" />
              </svg>
              Прогортайте до кінця
            </p>
          )}
          <button
            className={styles.confirmBtn}
            disabled={!hasReadAll}
            onClick={handleConfirm}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 7l3.5 3.5L12 3" />
            </svg>
            Ознайомився
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Terms content ─────────────────────────────────────────────────── */
const TermsContent: React.FC = () => (
  <div className={styles.docContent}>
    <p className={styles.docMeta}>Редакція від 1 липня 2026 р. · Чернетка, не перевірена юристом</p>

    <h2 className={styles.docH2}>1. Що таке MIMIR</h2>
    <p>MIMIR — персональний органайзер і "Memory OS" для організації вашого цифрового та реального життя. Застосунок дозволяє зберігати спогади, фінансові записи, звички, рецепти, нотатки, плани та інший особистий контент.</p>
    <p>MIMIR розробляється як незалежний проєкт. Сервіс надається "як є" без гарантій безперебійної роботи.</p>

    <h2 className={styles.docH2}>2. Акаунт і відповідальність користувача</h2>
    <p>Ви несете відповідальність за безпеку свого акаунту, включаючи пароль та PIN-код. Не передавайте облікові дані третім особам.</p>
    <p>Ви погоджуєтеся використовувати MIMIR лише в законних цілях і не завантажувати контент, що порушує права інших або чинне законодавство.</p>
    <p>Ви повинні бути не молодше 16 років для використання сервісу.</p>

    <h2 className={styles.docH2}>3. Контент користувача</h2>
    <p>Весь контент, який ви додаєте (спогади, фото, нотатки, транзакції тощо), залишається вашою власністю. Ви надаєте MIMIR обмежену ліцензію на зберігання та відображення цього контенту виключно для забезпечення роботи сервісу.</p>
    <p>Ви відповідаєте за законність завантаженого контенту. Забороняється завантажувати матеріали, що порушують авторські права, містять незаконний контент або персональні дані третіх осіб без їх згоди.</p>

    <h2 className={styles.docH2}>4. AI-функції</h2>
    <p>MIMIR містить функції на основі штучного інтелекту (AI-чат, AI-шеф, аналіз фінансів, розпізнавання чеків, генерація рецептів). Ці функції носять виключно допоміжний характер і <strong>не є</strong> фінансовою, медичною, юридичною або іншою професійною порадою.</p>
    <p>AI-відповіді можуть містити неточності. Приймайте рішення на основі власного судження.</p>

    <h2 className={styles.docH2}>5. Підписка та оплата</h2>
    <p>Базовий план MIMIR є безкоштовним. Платні плани: PERSONAL (199₴/міс), DUO (299₴/міс), GROUP (449₴/міс). Річна підписка — знижка 33%.</p>
    <p>Підписку можна скасувати в будь-який момент через розділ "Тариф" у профілі. Повернення коштів розглядається індивідуально протягом 14 днів після оплати.</p>

    <h2 className={styles.docH2}>6. Доступність сервісу</h2>
    <p>MIMIR прагне забезпечити максимальний uptime, але не гарантує безперебійну роботу. Сервіс може бути недоступний через технічні роботи, форс-мажорні обставини або збої інфраструктури.</p>
    <p>Ми залишаємо за собою право змінювати або припиняти окремі функції з попереднім повідомленням.</p>

    <h2 className={styles.docH2}>7. Обмеження відповідальності</h2>
    <p>MIMIR не несе відповідальності за втрату даних, прямі або непрямі збитки, що виникли внаслідок використання або неможливості використання сервісу.</p>
    <p>Максимальна відповідальність MIMIR обмежена сумою, сплаченою вами за останні 3 місяці підписки.</p>

    <h2 className={styles.docH2}>8. Зміни умов</h2>
    <p>Ми можемо змінювати ці умови. При суттєвих змінах ми повідомимо вас через застосунок або email щонайменше за 14 днів. Продовження використання після набрання змін чинності означає прийняття нових умов.</p>

    <h2 className={styles.docH2}>9. Контакт</h2>
    <p>З питань щодо умов користування звертайтесь: <a href="mailto:support@mimir-hud.tech" className={styles.docLink}>support@mimir-hud.tech</a></p>
  </div>
)

/* ─── Privacy content ───────────────────────────────────────────────── */
const PrivacyContent: React.FC = () => (
  <div className={styles.docContent}>
    <p className={styles.docMeta}>Редакція від 1 липня 2026 р. · Чернетка, не перевірена юристом</p>

    <h2 className={styles.docH2}>1. Що ми збираємо та навіщо</h2>
    <p>MIMIR — це Memory OS для особистого використання. Ми збираємо лише ті дані, які ви самі вводите або дозволяєте зібрати.</p>

    <h3 className={styles.docH3}>Акаунт та автентифікація</h3>
    <p>Email (опційно), ім'я, username, хеш пароля (bcrypt), PIN-хеш (bcrypt, опційно). Google OAuth: ми отримуємо ваш Google ID та email — пароль Google ніколи не потрапляє до нас. JWT-токени для сесії (access 15 хв, refresh 30 днів у httpOnly cookie).</p>

    <h3 className={styles.docH3}>Особистий контент</h3>
    <p>Спогади (текст, місця, дати, теги, фото), плани подорожей, нотатки, звички та завдання, рецепти, список перегляду медіа, регулярні платежі.</p>

    <h3 className={styles.docH3}>Фінансові дані</h3>
    <p>Транзакції доходів і витрат (сума, опис, категорія, дата). Якщо ви підключаєте Monobank — ми зберігаємо токен доступу в зашифрованому вигляді (AES-256-GCM).</p>

    <h3 className={styles.docH3}>Геодані</h3>
    <p>Координати місць, які ви додаєте до спогадів і планів. Місто профілю (для погоди). Ми не відстежуємо ваше місцезнаходження у фоновому режимі.</p>

    <h3 className={styles.docH3}>AI-запити</h3>
    <p>Запити до AI-чату та інших AI-функцій передаються через наш бекенд до Anthropic API. Самі AI-діалоги <strong>не зберігаються</strong> у нашій базі даних — вони є транзитними.</p>

    <h2 className={styles.docH2}>2. Треті сторони та підпроцесори</h2>
    <table className={styles.docTable}>
      <thead>
        <tr><th>Сервіс</th><th>Мета</th><th>Дані</th></tr>
      </thead>
      <tbody>
        <tr><td>MongoDB Atlas</td><td>База даних</td><td>Всі персональні дані</td></tr>
        <tr><td>Cloudinary</td><td>Зберігання фото</td><td>Завантажені зображення</td></tr>
        <tr><td>Mapbox</td><td>Карти та геокодинг</td><td>Координати місць</td></tr>
        <tr><td>Anthropic</td><td>AI-функції</td><td>Текст запитів (транзитно)</td></tr>
        <tr><td>Resend</td><td>Email-верифікація</td><td>Email-адреса</td></tr>
        <tr><td>Monobank</td><td>Банківська інтеграція</td><td>Зашифрований токен</td></tr>
        <tr><td>Vercel</td><td>Хостинг фронтенду</td><td>Логи запитів</td></tr>
        <tr><td>Railway</td><td>Хостинг бекенду</td><td>Логи запитів</td></tr>
      </tbody>
    </table>

    <h2 className={styles.docH2}>3. Як ми зберігаємо та захищаємо дані</h2>
    <p>Паролі зберігаються виключно у вигляді bcrypt-хешу. Токени Monobank шифруються AES-256-GCM. З'єднання між клієнтом і сервером — тільки HTTPS. Refresh-токени зберігаються у httpOnly Secure cookie та хешуються в базі даних.</p>
    <p>Ми не продаємо ваші дані третім особам і не використовуємо їх для реклами.</p>

    <h2 className={styles.docH2}>4. Ваші права (GDPR)</h2>
    <ul className={styles.docList}>
      <li><strong>Доступ:</strong> перегляд і управління вашими даними через застосунок.</li>
      <li><strong>Портабельність:</strong> експорт усіх даних у форматі JSON через Профіль → Налаштування.</li>
      <li><strong>Видалення:</strong> запит на видалення акаунту через Профіль → Налаштування. Дані зберігаються 30 днів після запиту.</li>
      <li><strong>Виправлення:</strong> редагування профілю та будь-якого контенту в застосунку.</li>
      <li><strong>Заперечення:</strong> зверніться до нас для будь-яких питань щодо обробки даних.</li>
    </ul>

    <h2 className={styles.docH2}>5. Cookies та сесії</h2>
    <p>Ми використовуємо один httpOnly cookie (<code className={styles.docCode}>rt</code>) для зберігання refresh-токена. Ніяких маркетингових або аналітичних cookies ми не встановлюємо.</p>

    <h2 className={styles.docH2}>6. Діти</h2>
    <p>MIMIR не призначений для осіб молодше 16 років. Ми свідомо не збираємо дані дітей. Якщо ви вважаєте, що дитина зареєструвалась — зверніться до нас для видалення акаунту.</p>

    <h2 className={styles.docH2}>7. Зміни політики</h2>
    <p>При суттєвих змінах ми повідомимо вас через застосунок або email щонайменше за 14 днів до набрання змін чинності.</p>

    <h2 className={styles.docH2}>8. Контакт</h2>
    <p>З питань конфіденційності: <a href="mailto:support@mimir-hud.tech" className={styles.docLink}>support@mimir-hud.tech</a></p>
  </div>
)

export default LegalDocModal
