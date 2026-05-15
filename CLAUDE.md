# HUD — Personal Organizer PWA

## Концепція
**HUD** (Heads Up Display) — особистий органайзер для повного контролю над фінансами, розкладом F1, менторською програмою та тижневими спрінтами. Назва відсилає одночасно до геймінгу, sci-fi та F1 — відображає характер власника: гік + фанат Формули 1.

---

## Структура репозиторію

```
/
├── client/          # Frontend — React + TypeScript PWA
│   ├── public/
│   │   ├── fonts/   # Тут розмістити файл шрифту Furore (furore.woff2 або furore.ttf)
│   │   ├── icons/
│   │   ├── manifest.json
│   │   └── sw.js
│   └── src/
│       ├── components/
│       ├── screens/
│       ├── hooks/
│       ├── store/
│       ├── types/
│       ├── utils/
│       └── styles/
└── backend/         # Backend — порожньо, повернемось пізніше
```

---

## Технічний стек

### Frontend (`/client`)
- **React 18** + **TypeScript**
- **Vite** — білдер
- **Zustand** — стейт менеджмент (легкий, без бойлерплейту)
- **React Router v6** — навігація між екранами
- **CSS Modules** або **styled-components** — стилізація (на розсуд, головне консистентність)
- **PWA** — Vite PWA Plugin (`vite-plugin-pwa`)
- **Service Worker** — офлайн підтримка + підготовка до push-нотифікацій

### Backend (`/backend`)
- Поки порожньо. У майбутньому: Node.js + Express/Fastify, Web Push VAPID для push-нотифікацій

---

## Правила написання компонентів

**ОБОВ'ЯЗКОВО** — перед кожним компонентом у файлі писати JSDoc-опис інтерфейсу:

```tsx
/**
 * BalanceHero
 * ----------
 * Головна картка балансу на екрані фінансів.
 *
 * Props:
 * @prop {number}  balance        — поточний баланс на картці (грн)
 * @prop {number}  dailyBudget    — розрахований денний бюджет до кінця місяця
 * @prop {number}  monthSpent     — витрачено за поточний місяць
 * @prop {number}  daysLeft       — кількість днів до кінця місяця
 * @prop {number}  progressPct    — відсоток витрат від поповнень (0–100)
 */
interface BalanceHeroProps {
  balance: number
  dailyBudget: number
  monthSpent: number
  daysLeft: number
  progressPct: number
}

const BalanceHero: React.FC<BalanceHeroProps> = ({ ... }) => {
  ...
}
```

---

## Дизайн-система

### Палітра — Ferrari 2021 × Graphite
```css
--bg:         #0a0a0a   /* основний фон */
--bg2:        #111111
--bg3:        #1a1a1a
--surface:    #1e1e1e   /* картки */
--surface2:   #252525
--border:     #2a2a2a
--border2:    #333333

--red:        #c8102e   /* Ferrari red — основний акцент */
--red-dim:    #8b0b1f
--red-glow:   rgba(200,16,46,0.25)
--red-soft:   rgba(200,16,46,0.12)
--gold:       #d4a017   /* другорядний акцент */
--gold-dim:   rgba(212,160,23,0.15)

--text:       #f0ece8   /* основний текст */
--text2:      #9a9490   /* другорядний */
--text3:      #5a5652   /* плейсхолдери, мета */

--green:      #2ecc71   /* позитивні значення */
--green-s:    rgba(46,204,113,0.12)
--orange:     #e67e22
--orange-s:   rgba(230,126,34,0.12)
```

### Типографіка
```css
/* Furore — для заголовків, логотипу, великих акцентних елементів */
/* Файл розмістити у /client/public/fonts/ */
/* Підключення в глобальних стилях: */
@font-face {
  font-family: 'Furore';
  src: url('/fonts/furore.woff2') format('woff2'),
       url('/fonts/furore.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

/* Barlow Condensed — навігація, теги, UI-елементи, цифри */
/* Barlow — body text, описи */
/* JetBrains Mono — числові значення, дати, коди */
```

### CSS змінні для шрифтів
```css
--font-display:  'Furore', 'Barlow Condensed', sans-serif
--font-ui:       'Barlow Condensed', sans-serif
--font-body:     'Barlow', sans-serif
--font-mono:     'JetBrains Mono', monospace
```

---

## Екрани (Screens)

### 1. Dashboard (`/`) — Головний екран / Cockpit
Центральний HUD — все найважливіше на одному екрані.

**Блоки:**
- **Верхній рядок:** поточний час + день тижня (великий, Furore)
- **Баланс-міні:** компактна картка з балансом і денним бюджетом
- **Наступна гонка:** картка з назвою ГП, прапором, зворотнім відліком (дні/години)
- **Спрінт тижня:** прогрес завдань (X / Y виконано) + 2-3 найближчі
- **Швидкі дії:** кнопки "+ Витрата" і "+ Завдання" завжди під рукою

### 2. Finance (`/finance`) — Фінанси
- Баланс hero-картка
- Денний бюджет до кінця місяця (авторозрахунок)
- Картка "Витрачено сьогодні" + дельта від денного бюджету
- Статистика: поповнення / витрати / залишок днів / бонус-дефіцит
- Форма поповнення
- Список транзакцій (останні 20)

**Логіка розрахунку:**
```
dailyBudget = Math.floor(currentBalance / daysLeftInMonth)
delta = dailyBudget - todayExpense  // + означає що вписуєшся
bonus = (dailyBudget * daysElapsed) - totalMonthExpense
```

### 3. F1 (`/f1`) — Календар сезону 2025
- Hero-картка наступного Гран Прі: прапор, назва, трек, зворотній відлік
- Повний список 24 Гран Прі сезону 2025
- Пройдені гонки — затемнені
- Наступна гонка — виділена червоним
- (Майбутнє) Push-нотифікація в понеділок перед гоночним уїкендом

### 4. Sprint (`/sprint`) — Спрінти та Менторство
**Таб "Спрінти":**
- Завдання на поточний тиждень
- Категорії: Менторство / Розробка / Особисте / Навчання
- Прогрес-бар тижня
- Тижнева ретроспектива (в кінці тижня)

**Таб "Уроки":**
- Список уроків менторської програми
- Поля: назва, опис/нотатки, статус (Заплановано / Проведено / Чернетка)
- Нотатки до сесії: що обговорювали, домашнє завдання студенту

---

## Структура компонентів (`/client/src/components`)

```
components/
├── ui/
│   ├── Card/
│   ├── Button/
│   ├── Input/
│   ├── Badge/
│   ├── ProgressBar/
│   ├── Modal/
│   └── Toast/
├── layout/
│   ├── TopBar/
│   └── BottomNav/
├── finance/
│   ├── BalanceHero/
│   ├── TodayCard/
│   ├── StatsGrid/
│   ├── TopupForm/
│   ├── ExpenseForm/       # форма витрат з вибором категорії
│   └── TransactionList/   # підтримує видалення транзакцій
├── f1/
│   ├── NextRaceCard/
│   ├── RaceCountdown/
│   └── RaceCalendarList/
├── sprint/
│   ├── SprintItem/
│   ├── SprintProgress/
│   └── WeekHeader/
├── lessons/
│   ├── LessonItem/
│   └── LessonForm/
├── dashboard/
│   ├── ClockBlock/
│   ├── BalanceMini/
│   ├── NextRaceMini/
│   └── SprintMini/
└── ui/
    └── WeatherSplash/     # splash-екран при запуску з погодою
```

---

## Стейт (Zustand stores)

```
store/
├── financeStore.ts   — balance, transactions, топапи; є deleteTransaction
├── sprintStore.ts    — завдання тижня, прогрес
├── lessonStore.ts    — уроки менторської програми
└── uiStore.ts        — модалки, тости, weather (WeatherData | null)
```

Персистентність через `zustand/middleware` → `localStorage`.

### Категорії витрат (`ExpenseForm`)

```
1. Кава
2. Продукти
3. Транспорт
   3.1 Таксі
   3.2 Метро
   3.3 Інше
4. Фібі (Троглодіт)
5. Коська           → додаткове текстове поле
6. Інше             → додаткове текстове поле
```

### WeatherSplash

- Компонент: `src/components/ui/WeatherSplash/index.tsx`
- API: Open-Meteo (погода) + Nominatim (назва міста, uk locale) — обидва безкоштовні, без ключа
- Іконки: inline SVG, 8 типів (Sun / PartlyCloudy / Cloudy / Fog / Drizzle / Rain / Snow / Thunder)
- Анімація: fade-in 0.3s → показ 1.5s → fade-out 0.3s → `onDone()`
- Дані зберігаються у `uiStore.weather` після завантаження
- Показується при кожному запуску (`splashDone` — локальний state в App.tsx)

---

## F1 Календар 2025 (дані)

Зберігати в `/client/src/data/f1Season2025.ts` як typed константу:

```ts
export interface F1Race {
  round: number
  name: string
  circuit: string
  date: string      // ISO: 'YYYY-MM-DD' — дата гонки (неділя)
  flag: string      // emoji прапора
  country: string
}

export const F1_SEASON_2025: F1Race[] = [
  { round: 1,  name: 'Australian GP',     circuit: 'Albert Park',                date: '2025-03-16', flag: '🇦🇺', country: 'Australia' },
  { round: 2,  name: 'Chinese GP',        circuit: 'Shanghai',                   date: '2025-03-23', flag: '🇨🇳', country: 'China' },
  { round: 3,  name: 'Japanese GP',       circuit: 'Suzuka',                     date: '2025-04-06', flag: '🇯🇵', country: 'Japan' },
  { round: 4,  name: 'Bahrain GP',        circuit: 'Bahrain International',      date: '2025-04-13', flag: '🇧🇭', country: 'Bahrain' },
  { round: 5,  name: 'Saudi Arabian GP',  circuit: 'Jeddah Corniche',            date: '2025-04-20', flag: '🇸🇦', country: 'Saudi Arabia' },
  { round: 6,  name: 'Miami GP',          circuit: 'Miami International',        date: '2025-05-04', flag: '🇺🇸', country: 'USA' },
  { round: 7,  name: 'Emilia Romagna GP', circuit: 'Imola',                      date: '2025-05-18', flag: '🇮🇹', country: 'Italy' },
  { round: 8,  name: 'Monaco GP',         circuit: 'Circuit de Monaco',          date: '2025-05-25', flag: '🇲🇨', country: 'Monaco' },
  { round: 9,  name: 'Spanish GP',        circuit: 'Circuit de Barcelona',       date: '2025-06-01', flag: '🇪🇸', country: 'Spain' },
  { round: 10, name: 'Canadian GP',       circuit: 'Circuit Gilles Villeneuve',  date: '2025-06-15', flag: '🇨🇦', country: 'Canada' },
  { round: 11, name: 'Austrian GP',       circuit: 'Red Bull Ring',              date: '2025-06-29', flag: '🇦🇹', country: 'Austria' },
  { round: 12, name: 'British GP',        circuit: 'Silverstone',                date: '2025-07-06', flag: '🇬🇧', country: 'UK' },
  { round: 13, name: 'Belgian GP',        circuit: 'Spa-Francorchamps',          date: '2025-07-27', flag: '🇧🇪', country: 'Belgium' },
  { round: 14, name: 'Hungarian GP',      circuit: 'Hungaroring',                date: '2025-08-03', flag: '🇭🇺', country: 'Hungary' },
  { round: 15, name: 'Dutch GP',          circuit: 'Zandvoort',                  date: '2025-08-31', flag: '🇳🇱', country: 'Netherlands' },
  { round: 16, name: 'Italian GP',        circuit: 'Monza',                      date: '2025-09-07', flag: '🇮🇹', country: 'Italy' },
  { round: 17, name: 'Azerbaijan GP',     circuit: 'Baku City Circuit',          date: '2025-09-21', flag: '🇦🇿', country: 'Azerbaijan' },
  { round: 18, name: 'Singapore GP',      circuit: 'Marina Bay',                 date: '2025-10-05', flag: '🇸🇬', country: 'Singapore' },
  { round: 19, name: 'United States GP',  circuit: 'Circuit of the Americas',    date: '2025-10-19', flag: '🇺🇸', country: 'USA' },
  { round: 20, name: 'Mexico City GP',    circuit: 'Autodromo Hermanos Rodriguez',date: '2025-10-26', flag: '🇲🇽', country: 'Mexico' },
  { round: 21, name: 'São Paulo GP',      circuit: 'Interlagos',                 date: '2025-11-09', flag: '🇧🇷', country: 'Brazil' },
  { round: 22, name: 'Las Vegas GP',      circuit: 'Las Vegas Strip',            date: '2025-11-22', flag: '🇺🇸', country: 'USA' },
  { round: 23, name: 'Qatar GP',          circuit: 'Losail International',       date: '2025-11-30', flag: '🇶🇦', country: 'Qatar' },
  { round: 24, name: 'Abu Dhabi GP',      circuit: 'Yas Marina',                 date: '2025-12-07', flag: '🇦🇪', country: 'UAE' },
]
```

---

## PWA конфігурація

- `vite-plugin-pwa` з `registerType: 'autoUpdate'`
- `theme_color: '#0d0d0d'`
- `background_color: '#0a0a0a'`
- Service Worker готовий до підключення Web Push (VAPID) у майбутньому
- Іконки: `/client/public/icons/icon-192.png`, `icon-512.png` — потрібно додати

---

## Важливі домовленості

1. **Компонентний підхід** — кожен компонент в окремій папці з `index.tsx` і за потреби `*.module.css`
2. **JSDoc перед кожним компонентом** — обов'язково, опис пропсів перед `interface`
3. **Furore** — використовувати для: логотипу HUD, великих заголовків екранів, числових hero-значень (баланс, відлік F1)
4. **Barlow Condensed** — навігація, теги, кнопки, підписи
5. **JetBrains Mono** — всі числові значення, дати, технічні рядки
6. **Без зайвих залежностей** — не додавати бібліотеки якщо можна зробити нативно
7. **localStorage** через Zustand persist — до підключення бекенду
8. **Backend папка порожня** — не чіпати, повернемось пізніше

---

## Статус реалізації

### Зроблено
- [x] Scaffold проекту (Vite + React + TypeScript)
- [x] Залежності: `zustand`, `react-router-dom`, `vite-plugin-pwa`
- [x] Дизайн-система: CSS змінні, шрифти (Furore / Barlow / JetBrains Mono)
- [x] UI компоненти: Card, Button, Input, Badge, ProgressBar, Modal, Toast
- [x] Layout: TopBar + BottomNav
- [x] Екран Dashboard
- [x] Екран Finance — баланс, витрати, поповнення, статистика, список транзакцій
  - [x] `ExpenseForm` — вибір категорії чіпами + підкатегорії транспорту + текстове поле
  - [x] `TransactionList` — видалення з inline-підтвердженням
- [x] Екран F1 — календар сезону 2025, зворотній відлік
- [x] Екран Sprint — завдання тижня + уроки менторства
- [x] `WeatherSplash` — погодний splash при запуску

### Далі
- [ ] Push-нотифікації (VAPID) — потребує backend
- [ ] Backend: Node.js + Express/Fastify
- [ ] Іконки PWA: `icon-192.png`, `icon-512.png`
- [ ] Шрифт Furore: розмістити у `/client/public/fonts/`
