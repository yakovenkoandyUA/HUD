# HUD — Personal Organizer PWA

## Концепція
**HUD** (Heads Up Display) — особистий органайзер для повного контролю над фінансами, розкладом F1, менторською програмою, тижневими спрінтами та особистим контентом. Назва відсилає одночасно до геймінгу, sci-fi та F1 — відображає характер власника: гік + фанат Формули 1.

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
│       ├── data/
│       └── styles/
└── backend/         # Backend — Node.js + Express + MongoDB
    ├── src/
    │   ├── routes/      # API endpoints
    │   ├── models/      # Mongoose схеми (Transaction, Sprint, Lesson, Recipe, Watchlist)
    │   ├── controllers/ # Логіка обробки запитів
    │   ├── middleware/  # Auth, error handling
    │   ├── services/    # WebPush, бізнес-логіка
    │   └── config/      # MongoDB підключення, env
    ├── .env.example
    └── package.json
```

---

## Технічний стек

### Frontend (`/client`)
- **React 18** + **TypeScript**
- **Vite** — білдер
- **Zustand** — стейт менеджмент (легкий, без бойлерплейту)
- **React Router v6** — навігація між екранами
- **CSS Modules** — стилізація
- **Recharts** — діаграми витрат у Finance екрані
- **Three.js** — 3D модель болида на F1 екрані
- **Service Worker** — офлайн підтримка + підготовка до push-нотифікацій

### Backend (`/backend`)
- **Node.js** + **Express** — REST API
- **Mongoose** — ODM для MongoDB
- **MongoDB Atlas** — хмарна база даних (безкоштовний tier 512MB)
- **Web Push (VAPID)** — push-нотифікації на Android
- **Auth** — JWT + bcrypt. Один користувач (особистий органайзер). При першому вході вводиш пароль → отримуєш JWT токен → зберігається в localStorage → більше не питає. Залежності: `jsonwebtoken`, `bcrypt`
- **Деплой** — Railway (~$1-2/міс) або Render (безкоштовно з нюансом sleep після 15хв)

**Архітектура:**
```
GitHub репо
    ├── /client  → Vercel        (безкоштовно)
    └── /backend → Railway       (~$1-2/міс)
                      ↓
               MongoDB Atlas     (безкоштовно, 512MB)
                      ↓
               Web Push VAPID → Android PWA
```

**Env змінні:**
```
# /backend .env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# /client .env
VITE_API_URL=https://your-app.railway.app
```

**Деплой flow:**
- Пушнув код в GitHub → Vercel і Railway автоматично деплоять
- Frontend і Backend живуть окремо але спілкуються через REST API

**Коли підключати:** після того як фронт готовий і використовується з localStorage.
Міграція localStorage → MongoDB буде простою бо структура даних та сама.

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

### Система тем
Застосунок підтримує **3 теми**, які перемикаються через налаштування.
Тема зберігається в `uiStore` → `localStorage`.
Реалізація через `data-theme` атрибут на `<html>` елементі + CSS змінні.

```tsx
// uiStore.ts
theme: 'retro' | 'warm' | 'dark' | 'japan'
setTheme: (theme) => void
```

```css
/* Перемикання теми */
document.documentElement.setAttribute('data-theme', theme)
```

---

### Тема 1 — RETRO 🎮 *(за замовчуванням)*
Вінтажна ретро-естетика. Темний фон, іржаво-червоний акцент, вінтажний зелений.
Настрій: старий комп'ютер, гік-культура, ретро sci-fi.

```css
[data-theme="retro"] {
  --bg:         #0d0d0d
  --bg2:        #141414
  --bg3:        #1c1a18
  --surface:    #201e1b
  --surface2:   #272421
  --border:     #2e2b27
  --border2:    #3a3630

  --accent:     #B83A2D   /* іржаво-червоний — головний акцент */
  --accent-dim: #7a2720
  --accent-glow: rgba(184,58,45,0.25)
  --accent-soft: rgba(184,58,45,0.12)

  --second:     #4E6851   /* вінтажний зелений — другорядний акцент */
  --second-soft: rgba(78,104,81,0.15)

  --gold:       #DCC9A9   /* бежевий — третій акцент / текст на темному */
  --gold-dim:   rgba(220,201,169,0.15)

  --text:       #EDE0CC   /* теплий молочний */
  --text2:      #9a8f82
  --text3:      #5c5248

  --positive:   #4E6851   /* прибуток */
  --negative:   #B83A2D   /* витрати */
}
```

---

### Тема 2 — WARM 🌅
Ретро-футуристична. Темний сіро-синій фон, бірюза + золото + теракота.
Настрій: захід сонця, пригоди, Wes Anderson зустрічає sci-fi.

```css
[data-theme="warm"] {
  --bg:         #1a2328
  --bg2:        #1f2c33
  --bg3:        #24343c
  --surface:    #264653
  --surface2:   #2d5060
  --border:     #2f5a69
  --border2:    #386070

  --accent:     #E76F51   /* теракота — головний акцент */
  --accent-dim: #a84e38
  --accent-glow: rgba(231,111,81,0.25)
  --accent-soft: rgba(231,111,81,0.12)

  --second:     #2A9D8F   /* Persian green — другорядний акцент */
  --second-soft: rgba(42,157,143,0.15)

  --gold:       #E9C46A   /* saffron золото */
  --gold-dim:   rgba(233,196,106,0.15)

  --text:       #f0ece8
  --text2:      #9ab0b8
  --text3:      #5a7a82

  --positive:   #2A9D8F
  --negative:   #E76F51
}
```

---

### Тема 3 — DARK ⬛
Класичний темний графіт. Запасний варіант.
Настрій: мінімалістичний, нейтральний.

```css
[data-theme="dark"] {
  --bg:         #0a0a0a
  --bg2:        #111111
  --bg3:        #1a1a1a
  --surface:    #1e1e1e
  --surface2:   #252525
  --border:     #2a2a2a
  --border2:    #333333

  --accent:     #c8102e
  --accent-dim: #8b0b1f
  --accent-glow: rgba(200,16,46,0.25)
  --accent-soft: rgba(200,16,46,0.12)

  --second:     #2ecc71
  --second-soft: rgba(46,204,113,0.12)

  --gold:       #d4a017
  --gold-dim:   rgba(212,160,23,0.15)

  --text:       #f0ece8
  --text2:      #9a9490
  --text3:      #5a5652

  --positive:   #2ecc71
  --negative:   #c8102e
}
```

---

### Тема 4 — JAPAN 🎌
Єдина світла тема. Японський мінімалізм — туш, кремовий папір, червоний акцент.
Настрій: editorial, спокій, foxspirit energy 🦊

```css
[data-theme="japan"] {
  --bg:         #F5F0EB   /* кремовий папір */
  --bg2:        #EDE8E2
  --bg3:        #E5DED6
  --surface:    #EDE8E2
  --surface2:   #E0D9D0
  --border:     #D5CEC5
  --border2:    #C8C0B6

  --accent:     #C8102E   /* червона туш — головний акцент */
  --accent-dim: #8b0b1f
  --accent-glow: rgba(200,16,46,0.2)
  --accent-soft: rgba(200,16,46,0.08)

  --second:     #1a1a1a   /* майже чорний — другорядний акцент */
  --second-soft: rgba(26,26,26,0.08)

  --gold:       #8B7355   /* тепла охра замість золота */
  --gold-dim:   rgba(139,115,85,0.15)

  --text:       #1a1a1a   /* чорна туш */
  --text2:      #6b6560
  --text3:      #a09890

  --positive:   #2d6a4f   /* темний зелений як в японських чорнилах */
  --negative:   #C8102E
}
```

**Додатковий шрифт для JAPAN теми:**
```css
/* Cormorant Garamond — для заголовків у JAPAN темі */
/* Підключити через Google Fonts разом з Barlow */
/* Використовувати як --font-display тільки в japan темі */

[data-theme="japan"] {
  --font-display: 'Cormorant Garamond', 'Furore', serif
}
```

**Декоративні елементи JAPAN теми:**
- Тонкі лінії замість жирних borders
- Можливі SVG декоративні елементи у стилі японської каліграфії як фонові акценти
- Тіні — не box-shadow а легкий drop-shadow як від туші на папері

---

### Важливо про змінні
Всі компоненти використовують **семантичні змінні** — не хардкодити кольори!
- `--accent` замість конкретного hex
- `--positive` / `--negative` для фінансових значень
- `--second` для другорядних акцентів

```tsx
// ❌ Неправильно
color: '#B83A2D'

// ✅ Правильно  
color: 'var(--accent)'
```

### Типографіка
```css
/* Furore — для заголовків, логотипу, великих акцентних елементів */
/* Файл розмістити у /client/public/fonts/ */
@font-face {
  font-family: 'Furore';
  src: url('/fonts/furore.woff2') format('woff2'),
       url('/fonts/furore.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

/* Barlow Condensed — навігація, теги, UI-елементи */
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

### Типографіка числових значень (важливо!)
- Великі числа (баланс, відлік F1) → **Furore**
- Символ `₴` → **Barlow Condensed** (Furore не підтримує гривню) — підібрати розмір щоб органічно виглядав поруч
- Дати, технічні рядки → **JetBrains Mono**

### Кольори категорій у гаманці
Кожна категорія витрат має свій унікальний колір в історії транзакцій:
- 🟢 Зелений — надходження (поповнення)
- 🔴 Червоний — витрати (загальне)
- Інші категорії (їжа, транспорт, розваги тощо) — унікальні кольори, головне щоб вирізнялись

---

## Екрани (Screens)

### 1. Dashboard (`/`) — Головний екран / Cockpit
Центральний HUD — все найважливіше на одному екрані.

**Лейаут топбару:**
- Логотип **HUD** — зліва
- Годинник — справа (Furore, великий)

**Блоки на екрані (зверху вниз):**
- **Баланс-міні** — компактна картка з поточним балансом і денним бюджетом
- **Блюдо неділі** — блок з TheMealDB API. При натисканні → окрема сторінка з картинкою та рецептом
- **Наступна гонка** — картка з назвою ГП, прапором, зворотнім відліком (дні/години)
- **Спрінт тижня** — прогрес завдань (X / Y виконано) + 2-3 найближчі завдання
- **NASA APOD** — блок з NASA Astronomy Picture of the Day (розміщення на розсуд)
- **Швидкі дії** — кнопки "Витрата" і "Завдання" (без символу `+`, використати іконку)

**Анімація запуску:**
- SVG анімація при старті застосунку (~1.5-2 сек)
- Погоду і зайве з анімації прибрати, залишити місце під цікаву SVG анімацію пізніше

### 2. Finance (`/finance`) — Фінанси
- Баланс hero-картка
- Денний бюджет до кінця місяця (авторозрахунок)
- Картка "Витрачено сьогодні" + дельта від денного бюджету
- Статистика: поповнення / витрати / залишок днів / бонус-дефіцит
- Форма поповнення
- Список транзакцій (останні 20) — кожна категорія свого кольору
- Кнопка додавання витрат — **без символу `+`**, використати іконку

**Трекер покупок:**
- Відстеження покупок в магазинах
- Статистика за місяць / тиждень — що купую найчастіше
- Перегляд патернів витрат

**Діаграма витрат:**
- Donut/Pie chart розбивка витрат по категоріях за місяць
- Категорії: 🛒 Їжа / 🚗 Транспорт / 🎮 Розваги / 👕 Одяг / 💊 Здоров'я / 📦 Інше
- Кожна категорія свого кольору (семантичні змінні)
- Бібліотека: **Recharts** (легка, React-friendly)
- При натисканні на сектор → фільтрує список транзакцій по категорії

**Цілі / Savings Goals:**
- Картки цілей на які збираєш кошти
- Поля: назва, emoji іконка, цільова сума, поточна сума, дедлайн
- Прогрес-бар накопичення з відсотком
- Можливість поповнити ціль вручну
- Приклади: 🎮 Xbox, ✈️ Відпустка, 🔧 Ремонт
- Горизонтальний скрол карток як на макеті

**Логіка розрахунку:**
```
dailyBudget = Math.floor(currentBalance / daysLeftInMonth)
delta = dailyBudget - todayExpense  // + означає що вписуєшся
bonus = (dailyBudget * daysElapsed) - totalMonthExpense
```

### 3. F1 (`/f1`) — Формула 1
- Hero-картка наступного Гран Прі: прапор, назва, трек, зворотній відлік
- Повний список 22 Гран Прі сезону 2026
- Пройдені гонки — затемнені, наступна — виділена червоним
- **Два таби** — "Календар" і "Чемпіонат" (перемикаються в межах F1 екрану)
- **Таб "Чемпіонат" → ChampionshipTable:**
  - Суб-таби: Пілоти / Команди
  - Пілоти: OpenF1 `championship_drivers` — position, name, team, points + **фото (headshot_url)**
  - Фото: circular 36px avatar, fallback initials, CORS proxy через `images.weserv.nl`
  - Команди: Jolpica API `current/constructorstandings`
  - Top-3: gold/silver/bronze highlight рядків
  - Skeleton shimmer під час завантаження, error+retry стан
  - Кеш: sessionStorage з денним ключем `hud-champ-YYYY-MM-DD`
- (Майбутнє) Push-нотифікація в понеділок перед уїкендом: "it's race weekend 🏎"

### 4. Sprint (`/sprint`) — Спрінти та Менторство

**Таб "Спрінти":**
- Завдання на поточний тиждень
- Категорії: Менторство / Розробка / Особисте / Навчання
- Прогрес-бар тижня
- Тижнева ретроспектива (в кінці тижня)

**Таб "Список покупок"**:
- Список справ і покупок поза тижневим спрінтом
- Режим додавання: **одна річ** або **список** (перемикач у формі)
- Маркери терміновості через `PriorityBadge` (▲◆▽ замість emoji):
  - ▲ **ТЕРМІНОВО** — `var(--negative)`
  - ◆ **ПРОСТО ПРИДБАТИ** — `var(--gold)`
  - ▽ **АБИ БУЛО** — `var(--positive)`
- Можливість встановити термін виконання

**Таб "Уроки":**
- Список уроків менторської програми
- Поля: назва, опис/нотатки, статус (Заплановано / Проведено / Чернетка)
- Нотатки до сесії: що обговорювали, домашнє завдання студенту

### 5. Recipes (`/recipes`) — Рецепти
Особиста кулінарна книга + блюдо дня.

**Банер / Hero:**
- "Блюдо неділі" з TheMealDB — велика картинка, назва, кнопка "Переглянути рецепт"
- При натисканні → повна сторінка: картинка, інгредієнти, спосіб приготування

**Особисті рецепти:**
- Додавання власних рецептів: назва, інгредієнти, спосіб готування
- Картинки — поки як посилання

**Рекомендації:**
- "Що приготувати сьогодні / на тиждень"
- Фільтри або рекомендації на основі наявних рецептів

### 6. Незабутько (`/watchlist`) — Контент-трекер
*(Тимчасова назва)*

**Категорії:**
- 🎬 Фільми
- 📺 Серіали
- 🎌 Аніме
- 📚 Книги

**Функціонал:**
- Додавання: назва, жанр, статус
- Статуси: Переглянув / Дивлюсь / Хочу подивитись / Кинув
- Нагадування про новий сезон / продовження
- Обкладинки — поки як посилання

**Підвкладка "Буду дивитись":**
- Окремий список запланованого контенту
- Швидке додавання "подивитись потім"

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
│   ├── Toast/
│   └── PriorityBadge/      ← ▲◆▽ маркери терміновості (urgent/normal/low)
├── layout/
│   ├── TopBar/
│   ├── BottomNav/
│   └── ThemePicker/        ← перемикач тем
├── finance/
│   ├── BalanceHero/
│   ├── TodayCard/
│   ├── StatsGrid/
│   ├── TopupForm/
│   ├── TransactionList/
│   ├── ShoppingTracker/
│   ├── GoalsList/          ← savings goals з горизонтальним скролом
│   ├── ExpenseChart/       ← donut chart витрат по категоріях (Recharts)
│   ├── SavingsGoals/
│   └── SavingsGoalCard/
├── f1/
│   ├── NextRaceCard/
│   ├── RaceCalendarList/
│   ├── ChampionshipTable/  ← пілоти (фото) + команди, суб-таби
│   ├── TrackSVG/           ← SVG траси з draw-path анімацією (JS getTotalLength)
│   └── McLarenViewer/      ← Three.js 3D McLaren на F1 екрані
├── sprint/
│   ├── SprintItem/
│   ├── SprintProgress/
│   ├── WeekHeader/
│   ├── TodoList/
│   └── TodoItem/
├── lessons/
│   ├── LessonItem/
│   └── LessonForm/
├── recipes/
│   ├── MealBanner/         ← hero-банер блюда тижня з TheMealDB
│   ├── MealDetail/         ← повний рецепт у модалці
│   ├── RecipeCard/         ← картка особистого рецепту
│   └── RecipeForm/         ← форма додавання/редагування рецепту
├── watchlist/
│   ├── WatchlistItem/
│   ├── WatchlistForm/
│   └── WatchlistCategory/
└── dashboard/
    ├── CarHero/            ← Three.js McLaren MP4/5, 260px, OrbitControls + particles
    ├── BalanceMini/
    ├── NextRaceMini/
    ├── SprintMini/
    ├── LessonsMini/
    ├── TodosMini/
    ├── MealMini/
    └── NasaApod/
```

---

## Стейт (Zustand stores)

```
store/
├── financeStore.ts    — balance, transactions, топапи, shopping tracker
├── goalsStore.ts      — savings goals (назва, emoji, target/current amount, deadline)
├── sprintStore.ts     — завдання тижня, прогрес, todoList зі справами
├── lessonStore.ts     — уроки менторської програми
├── recipesStore.ts    — особисті рецепти + mealOfWeek (TheMealDB, кеш по тижню)
├── watchlistStore.ts  — фільми, серіали, аніме, книги
└── uiStore.ts         — модалки, тости, NASA/meal дані
```

Персистентність через `zustand/middleware` → `localStorage`.

---

## Зовнішні API

| API | Використання | Ключ |
|-----|-------------|------|
| **Open-Meteo** | Погода за геолокацією (анімація запуску) | Не потрібен |
| **TheMealDB** | Блюдо неділі, рецепти | Не потрібен |
| **NASA APOD** | Astronomy Picture of the Day на дашборді | Безкоштовний на api.nasa.gov |
| **OpenF1 API** | Залік пілотів з headshot_url (`/v1/championship_drivers?year=2026`) | Не потрібен |
| **Jolpica API** | Залік команд (`/ergast/f1/current/constructorstandings/`) — надійний форк Ergast | Не потрібен |

---

## F1 Календар 2026 (дані)

Зберігати в `/client/src/data/f1Season2026.ts`.
**Увага:** сезон 2026 — 22 гонки (Bahrain GP і Saudi Arabian GP скасовано).

```ts
export interface F1Race {
  round: number
  name: string
  circuit: string
  date: string      // ISO: 'YYYY-MM-DD'
  flag: string      // emoji прапора
  country: string
  sprint?: boolean
}

export const F1_SEASON_2026: F1Race[] = [
  { round: 1,  name: 'Australian GP',          circuit: 'Albert Park',                  date: '2026-03-08', flag: '🇦🇺', country: 'Australia' },
  { round: 2,  name: 'Chinese GP',             circuit: 'Shanghai',                     date: '2026-03-15', flag: '🇨🇳', country: 'China',       sprint: true },
  { round: 3,  name: 'Japanese GP',            circuit: 'Suzuka',                       date: '2026-03-29', flag: '🇯🇵', country: 'Japan' },
  { round: 4,  name: 'Miami GP',               circuit: 'Miami International',          date: '2026-05-03', flag: '🇺🇸', country: 'USA',         sprint: true },
  { round: 5,  name: 'Canadian GP',            circuit: 'Circuit Gilles Villeneuve',    date: '2026-05-24', flag: '🇨🇦', country: 'Canada',      sprint: true },
  { round: 6,  name: 'Monaco GP',              circuit: 'Circuit de Monaco',            date: '2026-06-07', flag: '🇲🇨', country: 'Monaco' },
  { round: 7,  name: 'Barcelona-Catalunya GP', circuit: 'Circuit de Barcelona',         date: '2026-06-14', flag: '🇪🇸', country: 'Spain' },
  { round: 8,  name: 'Austrian GP',            circuit: 'Red Bull Ring',                date: '2026-06-28', flag: '🇦🇹', country: 'Austria' },
  { round: 9,  name: 'British GP',             circuit: 'Silverstone',                  date: '2026-07-05', flag: '🇬🇧', country: 'UK',          sprint: true },
  { round: 10, name: 'Belgian GP',             circuit: 'Spa-Francorchamps',            date: '2026-07-19', flag: '🇧🇪', country: 'Belgium' },
  { round: 11, name: 'Hungarian GP',           circuit: 'Hungaroring',                  date: '2026-07-26', flag: '🇭🇺', country: 'Hungary' },
  { round: 12, name: 'Dutch GP',               circuit: 'Zandvoort',                    date: '2026-08-23', flag: '🇳🇱', country: 'Netherlands', sprint: true },
  { round: 13, name: 'Italian GP',             circuit: 'Monza',                        date: '2026-09-06', flag: '🇮🇹', country: 'Italy' },
  { round: 14, name: 'Spanish GP — Madrid',    circuit: 'Madring',                      date: '2026-09-13', flag: '🇪🇸', country: 'Spain' },
  { round: 15, name: 'Azerbaijan GP',          circuit: 'Baku City Circuit',            date: '2026-09-26', flag: '🇦🇿', country: 'Azerbaijan' },
  { round: 16, name: 'Singapore GP',           circuit: 'Marina Bay',                   date: '2026-10-11', flag: '🇸🇬', country: 'Singapore',   sprint: true },
  { round: 17, name: 'United States GP',       circuit: 'Circuit of the Americas',      date: '2026-10-25', flag: '🇺🇸', country: 'USA' },
  { round: 18, name: 'Mexico City GP',         circuit: 'Autodromo Hermanos Rodriguez', date: '2026-11-01', flag: '🇲🇽', country: 'Mexico' },
  { round: 19, name: 'São Paulo GP',           circuit: 'Interlagos',                   date: '2026-11-08', flag: '🇧🇷', country: 'Brazil' },
  { round: 20, name: 'Las Vegas GP',           circuit: 'Las Vegas Strip',              date: '2026-11-21', flag: '🇺🇸', country: 'USA' },
  { round: 21, name: 'Qatar GP',               circuit: 'Losail International',         date: '2026-11-29', flag: '🇶🇦', country: 'Qatar' },
  { round: 22, name: 'Abu Dhabi GP',           circuit: 'Yas Marina',                   date: '2026-12-06', flag: '🇦🇪', country: 'UAE' },
]
```

---

## SVG Траси F1

Файли зберігати в `/client/public/tracks/`

**Маппінг трас до файлів:**
```ts
// Додати поле trackSvg до інтерфейсу F1Race
export interface F1Race {
  round: number
  name: string
  circuit: string
  date: string
  flag: string
  country: string
  sprint?: boolean
  trackSvg: string | null  // шлях до SVG або null якщо немає
}
```

```ts
// Маппінг файлів сезону 2026
round 1  — Australian         → '/tracks/Australian.svg'
round 2  — Chinese            → null  // відсутній, показати placeholder
round 3  — Japanese           → '/tracks/Japanese(suzuka).svg'
round 4  — Miami              → '/tracks/Miami.svg'
round 5  — Canadian           → '/tracks/Canadian.svg'
round 6  — Monaco             → '/tracks/Monaco.svg'
round 7  — Barcelona-Catalunya → '/tracks/Spanish.svg'
round 8  — Austrian           → '/tracks/RedBullRing.svg'
round 9  — British            → '/tracks/British(Silverstone).svg'
round 10 — Belgian            → '/tracks/Belgian.svg'
round 11 — Hungarian          → '/tracks/Hungarian.svg'
round 12 — Dutch              → '/tracks/Dutch.svg'
round 13 — Italian            → '/tracks/Italia(monza).svg'
round 14 — Spanish Madrid     → '/tracks/Madrid.svg'
round 15 — Azerbaijan         → '/tracks/Azerbaijan.svg'
round 16 — Singapore          → '/tracks/Singapore.svg'
round 17 — United States      → '/tracks/USA(ostin).svg'
round 18 — Mexico City        → '/tracks/Mexican.svg'
round 19 — São Paulo          → '/tracks/Brazilian.svg'
round 20 — Las Vegas          → '/tracks/LasVegas.svg'
round 21 — Qatar              → '/tracks/Qatar.svg'
round 22 — Abu Dhabi          → '/tracks/abuDhabi.svg'
```

**Файли які є але не в календарі 2026 (не використовувати):**
- `Bahrain.svg`, `SaudiArabian.svg` — скасовані гонки
- `EmiliaRomagna.svg` — випала з календаря
- `French.svg` — не в календарі 2026

**Анімація draw-path (JS-driven, не CSS):**
```ts
// Після завантаження SVG — в useEffect([track, animated]):
const length = path.getTotalLength()
path.style.strokeDasharray = `${length}`
path.style.strokeDashoffset = `${length}`
path.style.transition = 'none'
void path.getBoundingClientRect()  // force reflow — обов'язково!
setTimeout(() => {
  path.style.transition = 'stroke-dashoffset 3.5s cubic-bezier(0.4, 0, 0.2, 1)'
  path.style.strokeDashoffset = '0'
}, 500)
```
- **Не використовувати фіксований dasharray** — кожна траса має різну довжину
- Наступна гонка: `stroke: var(--accent)`, яскраво
- Пройдені гонки: `stroke: var(--text3)`, приглушено
- Fill: `none` завжди
- Placeholder для null: пунктирне коло з написом "Track TBA"

**Компонент:** `src/components/f1/TrackSvg/index.tsx`

```tsx
/**
 * TrackSvg
 * --------
 * SVG схема траси з анімацією промальовування.
 *
 * Props:
 * @prop {string | null} src       — шлях до SVG файлу або null
 * @prop {boolean}       isNext    — чи це наступна гонка (акцентний колір)
 * @prop {boolean}       isPast    — чи пройдена гонка (приглушений колір)
 * @prop {number}        size      — розмір в пікселях (default: 80)
 * @prop {boolean}       animated  — чи вмикати draw анімацію (default: true)
 */
```

---

## 3D модель

**McLaren MP4/5 Formula 1**
- Файл: `/client/public/models/mclaren_mp45__formula_1.glb`
- Ліцензія: CC Attribution — обов'язково вказати кредити в UI
- Кредит: *McLaren MP4/5 by dark_igorek (CC Attribution, Sketchfab)*

**Два компоненти з моделлю:**

`src/components/dashboard/CarHero/` — Hero на Dashboard
- Canvas height: **260px**, CSS mask-image fade знизу
- 80 частинок у box 12×8×12 з повільним Y-обертанням
- OrbitControls: drag зупиняє autoRotate, відновлення через 3с
- Theme-aware освітлення через MutationObserver на `data-theme`:
  - japan: AmbientLight 0.3, DirectionalLight 0.6
  - решта: AmbientLight 0.6, DirectionalLight 1.2
- Кредит відображається як `<p>` під canvas

`src/components/f1/McLarenViewer/` — viewer на F1 екрані
- Окремий компонент, менша висота

**Спільні правила Three.js:**
- `renderer.dispose()` + geometry/material dispose при unmount — обов'язково
- DRACOLoader decoder: `https://www.gstatic.com/draco/versioned/decoders/1.5.6/`
- `alpha: true` на WebGLRenderer для прозорого фону

```ts
// Transaction
{ type: 'income' | 'expense', amount: Number, desc: String,
  category: String, date: String, userId: String }

// Sprint task
{ title: String, tag: String, done: Boolean,
  weekNumber: Number, year: Number, userId: String }

// Todo item
{ title: String, priority: 'urgent' | 'normal' | 'low',
  done: Boolean, dueDate: String, userId: String }

// Lesson
{ title: String, desc: String, status: String,
  sessionNotes: String, homework: String, userId: String }

// Recipe
{ title: String, ingredients: [String], steps: String,
  imageUrl: String, isPersonal: Boolean, userId: String }

// Watchlist item
{ title: String, category: 'movie'|'series'|'anime'|'book',
  status: String, imageUrl: String, reminderDate: String, userId: String }

// Savings Goal
{ title: String, emoji: String, targetAmount: Number,
  currentAmount: Number, deadline: String, userId: String }

// Push subscription
{ endpoint: String, keys: Object, userId: String }
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
3. **Система тем** — 5 тем: RETRO (default), WARM, DARK, JAPAN, HEROES. Перемикання через `data-theme` на `<html>`. Зберігається в `uiStore`
4. **Семантичні CSS змінні** — завжди `var(--accent)`, `var(--positive)` тощо, ніколи хардкод hex
5. **Furore** — логотип HUD, великі заголовки, числові hero-значення (баланс, відлік F1)
6. **Символ ₴** — Barlow Condensed (Furore не підтримує), підібрати розмір щоб органічно виглядав
7. **Barlow Condensed** — навігація, теги, кнопки, підписи
8. **JetBrains Mono** — всі числові значення, дати, технічні рядки
9. **Без символу `+` на кнопках витрат** — використовувати іконку
10. **Кольори категорій** — кожна категорія витрат має унікальний колір в історії
11. **Без зайвих залежностей** — не додавати бібліотеки якщо можна нативно
12. **localStorage** через Zustand persist — до підключення бекенду
13. **Backend папка порожня** — не чіпати, повернемось пізніше

---

## Статус реалізації (станом на 2026-05-24)

**Зроблено:**
- ✅ Scaffold, дизайн-система (5 тем: retro/warm/dark/japan/heroes), шрифти, CSS змінні
- ✅ UI компоненти: Card, Button, Input, Badge, ProgressBar, Modal, Toast, PriorityBadge
- ✅ Layout: TopBar, BottomNav, ThemePicker (2×2 grid + heroes картка)
- ✅ Dashboard: HeroCard (3D McLaren), SprintMini, LessonsMini, TodosMini, MealMini; NASA APOD через довгий тап на логотип
- ✅ Finance: BalanceHero, TodayCard, StatsGrid, TransactionList, ShoppingTracker, GoalsList
- ✅ F1: NextRaceCard (з TrackSVG draw-path), RaceCalendarList, RaceDetail, ChampionshipTable (пілоти з фото + команди), McLarenViewer
- ✅ Sprint: таби Спрінти / Список покупок / Уроки; PriorityBadge маркери; режим одна/список
- ✅ Recipes: MealBanner (TheMealDB, кеш по тижню), MealDetail, RecipeCard, RecipeForm
- ✅ Watchlist: екран `/watchlist` з категоріями movie/series/anime/book, пошук TMDB/Google Books
- ✅ PWA іконки: `icon-192.png`, `icon-512.png` — існують
- ✅ Всі store'и з Zustand persist
- ✅ SVG траси для всіх 22 гонок (крім Chinese — немає файлу)
- ✅ Backend: Express + Mongoose + JWT + VAPID на Railway; CORS відкритий (`cors()`)
- ✅ Frontend деплой на Vercel; backend деплой на Railway (hud-production.up.railway.app)

**Залишилось:**
- ⬜ Міграція goals з localStorage → MongoDB (goalsStore вже має backend інтеграцію, але старі дані в localStorage)

---

## Roadmap по етапах

**Етап 1 — Frontend** *(завершено)*
- ✅ React + TypeScript + Vite scaffold
- ✅ Дизайн-система + 5 тем
- ✅ Dashboard, Finance, F1, Sprint, Recipes, Watchlist екрани
- ✅ PWA іконки + конфігурація

**Етап 2 — Деплой Frontend** *(завершено)*
- ✅ GitHub репо → Vercel (автодеплой)
- ✅ HTTPS PWA посилання

**Етап 3 — Backend** *(завершено)*
- ✅ Node.js + Express + Mongoose scaffold
- ✅ MongoDB Atlas кластер
- ✅ REST API для всіх модулів
- ✅ JWT авторизація (один користувач)
- ✅ Web Push VAPID підготовлено

**Етап 4 — Деплой Backend** *(завершено)*
- ✅ Railway деплой `/backend` (hud-production.up.railway.app)
- ✅ Env змінні налаштовані
- ✅ Frontend підключений через VITE_API_URL (Vercel dashboard)
- ⬜ Міграція даних з localStorage → MongoDB (часткова: goals ще на localStorage)

**Етап 5 — Агенти** *(майбутнє)*
- Фінансовий аналітик — weekly summary
- Менторський помічник — структуровані звіти після сесій
