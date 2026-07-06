# Backend — MIMIR

## Стек

- **Node.js** + **Express** — REST API
- **Mongoose** — ODM для MongoDB Atlas (512MB free tier)
- **JWT** — авторизація, payload: `{ userId, role }`
- **Web Push (VAPID)** — push-нотифікації
- **Деплой** — Railway (`hud-production.up.railway.app`)

## Middleware

- `requireAuth` — перевіряє JWT, додає `req.userId`, `req.userRole`
- `requireAdmin` — 403 якщо `req.userRole !== 'admin'`
- `requireVerified` — 403 якщо `!user.isVerified` (DB-запит по `req.userId`, бо `isVerified` не входить у JWT payload). Навішаний на AI-фічі, що коштують грошей: `router.use` в `routes/ai.ts` (chat + chef-chat), інлайн на `POST /api/finance/report/:month` (тільки генерація, GET кешованого звіту відкритий), `POST /api/receipt/scan`, `POST /api/recipes/generate`

## API ендпоінти

| Route | Методи |
|-------|--------|
| `/api/auth/register` | POST — { email, password, name, username } |
| `/api/auth/login` | POST — { email, password } |
| `/api/auth/google` | POST — { credential } Google ID token |
| `/api/auth/pin` | PATCH (set), DELETE (remove) |
| `/api/auth/pin/verify` | POST — { pin } |
| `/api/auth/verify-email` | POST — { token } → isVerified = true |
| `/api/auth/resend-verification` | POST (auth) → re-sends verification email |
| `/api/auth/refresh` | POST — rotate refresh token (httpOnly cookie) |
| `/api/auth/logout` | POST — очищає cookie і DB запис |
| `/api/auth/me` | GET, PATCH |
| `/api/auth/admin/users` | GET — requireAdmin, список всіх юзерів |
| `/api/family` | GET — { accepted, pendingSent, pendingReceived } |
| `/api/family/search` | GET ?q=username |
| `/api/family/request` | POST — { recipientId } |
| `/api/family/accept/:linkId` | POST |
| `/api/family/:linkId` | DELETE |
| `/api/transactions` | GET, POST |
| `/api/transactions/:id` | DELETE |
| `/api/transactions/count` | GET ?category= — кількість транзакцій по категорії |
| `/api/transactions/migrate-category` | PATCH — { from, to } перенос транзакцій |
| `/api/sprint/tasks` | GET, POST |
| `/api/sprint/tasks/:id` | PATCH, DELETE |
| `/api/sprint/tasks/:id/restore` | POST — відновити з trash |
| `/api/sprint/todos` | GET, POST |
| `/api/sprint/todos/:id` | PATCH, DELETE |
| `/api/sprint/trash` | GET — soft-deleted tasks (TTL 24г) |
| `/api/lessons` | GET, POST |
| `/api/lessons/:id` | PATCH, DELETE |
| `/api/goals` | GET, POST |
| `/api/goals/:id` | PATCH, DELETE |
| `/api/goals/:id/deposit` | POST — { amount, date } |
| `/api/watchlist` | GET, POST |
| `/api/watchlist/:id` | PATCH, DELETE |
| `/api/watchlist/:id/comments` | GET, POST |
| `/api/recipes` | GET, POST |
| `/api/recipes/generate` | POST — AI-генерація рецепту (Anthropic) |
| `/api/recipes/cook-stats` | GET — `{ [recipeId]: { count, lastCooked } }` (MUST be before /:id) |
| `/api/recipes/:id` | PUT, DELETE |
| `/api/recipes/:id/cook` | POST — логує приготування (CookLog) |
| `/api/meal-plan` | GET, PUT — `{ plan: { [YYYY-MM-DD]: recipeId[] } }` |
| `/api/memories` | GET, POST |
| `/api/memories/:id` | PATCH, DELETE |
| `/api/memories/:id/photos` | POST |
| `/api/memories/:id/photos/:photoId` | PATCH, DELETE |
| `/api/plans` | GET, POST |
| `/api/plans/:id` | PATCH, DELETE |
| `/api/plans/:id/convert` | POST — план → спогад (visited) |
| `/api/notes` | GET, POST |
| `/api/notes/:id` | PATCH, DELETE |
| `/api/mood` | GET (today + family), POST — { score, notes } |
| `/api/mood/history` | GET — місячний heatmap |
| `/api/categories` | GET, POST |
| `/api/categories/:id` | PATCH, DELETE |
| `/api/receipt/scan` | POST — Anthropic Vision, auto-categorize |
| `/api/recurring` | GET, POST |
| `/api/recurring/:id` | PATCH, DELETE |
| `/api/shopping` | GET, POST |
| `/api/shopping/:id` | PATCH, DELETE |
| `/api/labels` | GET, POST |
| `/api/labels/:id` | PATCH, DELETE |
| `/api/push/subscribe` | POST — зберегти підписку |
| `/api/push/unsubscribe` | POST |
| `/api/push/test` | POST — тестова нотифікація |
| `/api/ai/chat` | POST — SSE streaming (Claude Haiku), domain-aware context |
| `/api/ai/chef-chat` | POST — SSE streaming (Claude Haiku), контекст рецепту з тіла запиту |
| `/api/finance/report/:month` | GET — AI-аналіз витрат по місяцю (Anthropic) |
| `/api/bank/connect` | POST — Monobank OAuth initiate |
| `/api/bank/status` | GET — статус з'єднання |
| `/api/bank/sync` | POST — синхронізація транзакцій |
| `/api/bank/disconnect` | DELETE |
| `/api/bank/import-csv` | POST — CSV import |
| `/api/books/search` | GET (proxy Google Books, кеш 10хв) |
| `/api/f1/predictions` | GET, POST, PATCH |
| `/api/weather` | GET ?city= — проксі до wttr.in (Cache-Control 30хв) |

## Env

```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_BOOKS_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
RESEND_API_KEY=...
MONOBANK_KEY=...        # (якщо є серверний ключ)
```

## Моделі — ключові поля

**User** — `email` (sparse unique), `passwordHash`, `pinHash` (optional), `role: 'admin'|'user'`, `f1Enabled: boolean`, `isVerified: boolean` (default false), `verificationToken: string|null`, `salaryDay: number`, `onboardingCompleted: boolean` (default false; `USER_PUBLIC_FIELDS` повертає `?? true` для старих юзерів де поле undefined)

**Transaction** — `type: 'income'|'expense'`, `date: string` (не Date), `categoryId` → Category, `source: 'manual'|'monobank'|'csv'`, `tripMemoryId?: string|null` (опційне посилання на trip-спогад для блоку "Витрати в поїздці"), сортувати по `createdAt`

**Category** — `name`, `icon` (Tabler ti-*), `color` (hex), `userId`, `isDefault`, `isActive`, `parentId` (субкатегорії), `order: number`

**SprintTask** — `weekNumber + year` = ідентифікатор тижня, `type: 'task'|'routine'`, `repeat: string` для звичок, `completionLog[]`, `checklist[]`, `labels[]`, `assignedTo[]`, `deletedAt` (soft-delete), `dueTime?: string` (HH:MM, опційний час дедлайну), `reminderSent: boolean` (анти-дубль для 5-хвилинного reminder-циклу, скидається при зміні `dueDate`/`dueTime`/`nextDue`/`reminder`)

**TodoItem** — `completionHistory: string[]` для стріків, `checklist[]` підзадачі, `repeat` + `nextDue` для звичок, `dueTime?: string`, `reminderSent: boolean`, `timeOfDay?: 'morning'|'afternoon'|'evening'|null` (слот для RoutineRing/TodayHabits)

**WatchlistItem** — `watchedEpisodes: number[]` прогрес серіалу, `watchedWith: string[]` (userId family members), `totalSeasons` з TMDB, `category: 'movie'|'series'|'anime'|'book'|'game'`, `runtimeMin`/`episodeRuntimeMin` — реальна тривалість з TMDB (фільм/епізод, хв) для точного підрахунку годин у WatchlistStatsSheet

**FamilyLink** — `requester: string`, `recipient: string`, `status: 'pending'|'accepted'`. Унікальний compound index `{requester, recipient}`. `getAcceptedFamilyIds(userId)` — shared helper.

**Memory** — `photos[]` subdocument array, `tags: string[]`, `notes: string`, `location: string`, `lat`/`lng: number|null` (для пінів на MemoryMap), `places: IMemoryPlace[]` (`{name, address, lat, lng}` — заклади всередині спогаду, рендеряться окремими пінами на MemoryMap; зберігаються через звичайний `PATCH /api/memories/:id`, **UI додавання ще не реалізований** — поле читається/рендериться, але форми створення place немає), `dateEnd: string|null` (кінець поїздки, default null), `isTrip: boolean` (default false). GET повертає `ownerName` + `ownerAvatarUrl` для сімейних записів.

**Plan** — `status: 'want'|'planned'|'visited'`, `location`, `photos[]`, `withProfiles[]`; при 'visited' конвертується в Memory

**SavingsGoal** — `deposits[]` subdocument array (amount + date), `currentAmount` = сума deposits

**RecurringPayment** — `amountForeign` + `currency: 'UAH'|'USD'|'EUR'` для валютних платежів

**BankConnection** — `userId`, `bank: 'monobank'`, `encryptedToken` (AES-256-GCM), `accountId`, `lastSync`

**MoodLog** — `userId`, `date: string`, `score: 1-5`, `notes: string`

**FinancialReport** — `userId`, `month: string` (YYYY-MM), `content: string` (markdown), `generatedAt`

**CookLog** — `userId`, `recipeId`, `cookedAt: Date`

## Зовнішні API

| API | Де використовується |
|-----|-------------|
| **Anthropic (Claude Haiku)** | AI чат (SSE), сканування чеків, генерація рецептів, фінансовий аналіз |
| **Monobank API** | OAuth connect, sync транзакцій, баланс |
| **OpenF1 API** | F1 live data (`api.openf1.org/v1/`) |
| **Jolpica API** | F1 залік команд/пілотів, результати гонок |
| **TMDB API** | Пошук фільмів/серіалів/аніме |
| **Google Books** | Пошук книг (через backend proxy) |
| **Resend** | Email верифікація (потребує домену mimir.app) |
| **Cloudinary** | Upload фото (unsigned preset, frontend direct) |
| **wttr.in** | Погода (через backend proxy) |

> Геокодинг місць (Memories/Plans) — `Mapbox Search Box API` + `Geocoding API`, викликається **з фронтенду напряму** (`VITE_MAPBOX_TOKEN`), без backend-проксі. `OpenStreetMap Nominatim` лишився тільки для авто-визначення міста профілю (`MeSystem`), теж напряму з фронтенду.

## Jobs/Schedulers

- `pushJobs` — три cron: F1 push за 1г до гонки (every-minute lightweight перевірка `F1_RACES_2026`), нова серія watchlist (10:00 UTC), новий сезон watchlist (09:00 UTC)
- `routineReminders` — cron 09:00 UTC, нагадування про невиконані звички
- `recurringReminders` — cron 09:00 UTC, нагадування про платежі (1/2/7 днів до)
- `dayReminder` — денний підсумок push 18:00 UTC (21:00 Kyiv)
- `f1Scheduler` — Sun 08:00 Kyiv weekend-алерт + **5-хвилинний reminder-цикл** для квестів/тудушок (точний до `dueDate`+`dueTime`, дефолт 09:00 якщо час не вказано; `reminderSent` анти-дубль) + daily 05:00 UTC нагадування про регулярні платежі (винесено в окремий cron, незалежний від 5-хвилинного циклу)
- `jobs/episodeReminder.ts` існує в репо, але **не імпортується** в `index.ts` (мертвий код, функціонал перенесено в `pushJobs`)

## Скрипти міграції

```bash
railway run npx ts-node src/scripts/seedCategories.ts
railway run npx ts-node src/scripts/updateCategoryPalette.ts
```
