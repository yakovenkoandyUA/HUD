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
- `loadUser` — завантажує повний `User` документ у `req.user` (для feature gates). **НЕ** глобальний — тільки на гейтованих роутах (щоб не бити в DB на кожному запиті). `req.user` задекларований в `types/express.d.ts` через inline `import()` (не top-level, щоб файл залишався ambient declaration).

## Білінг-архітектура (Phase 1+2+4A)

**`backend/src/config/pricing.ts`** — ціни в копійках: `PRICES[planId][interval]`. `getPrice()`, `validatePaidPlan()`, `validateBillingInterval()`.

**`backend/src/utils/billing.ts`** — `generateOrderReference()` (opaque, без userId), `calculateCurrentPeriodEnd(startDate, interval)` (calendar-aware, end-of-month clamp), `getGracePeriodEnd(currentPeriodEnd)` (+3 дні), `buildWayForPayEventKey()`.

## Entitlements (Phase 1+2)

- `backend/src/config/plans.ts` — single source of truth по планах: features + limits для free/personal/couple/family
- `backend/src/utils/entitlements.ts`:
  - `assertFeature(user, feature)` — кидає `{ status:403, code:'PLAN_GATE', feature }` якщо фіча недоступна (no-op поки `BILLING_ENABLED !== "true"`)
  - `assertLimit(user, limitKey, currentCount)` — кидає `{ status:403, code:'PLAN_LIMIT', limitKey, limit }` (no-op аналогічно)
  - `requireFeature(feature)` — Express middleware factory, передає помилку в `next(err)`
- `errorHandler.ts` — обробляє `PLAN_GATE` → `{ error, code, feature }` і `PLAN_LIMIT` → `{ error, code, limitKey, limit }`
- Guards навішані: `requireFeature('aiChat'/'aiChefChat')` у `routes/ai.ts`, `requireFeature('receiptScanner')` у `routes/receipt.ts`, `requireFeature('yearbookGenerate')` у `routes/yearbook.ts`, `requireFeature('familyLink')` у `routes/family.ts`, `requireFeature('advancedFinance')` у `routes/finance.ts`, `assertLimit(maxSpaces/sharedSpaces)` у `spaceController.ts`, timeline history у `timelineController.ts`

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
| `/api/auth/forgot-password` | POST — { email } → якщо акаунт з паролем існує, шле reset-лист (Resend); завжди `{ok:true}`, анти-enumeration |
| `/api/auth/reset-password` | POST — { token, newPassword } → перевіряє `resetPasswordToken`+`resetPasswordExpires`, оновлює пароль, автологінить (JWT+refresh) |
| `/api/auth/refresh` | POST — rotate refresh token (httpOnly cookie) |
| `/api/auth/logout` | POST — очищає cookie і DB запис |
| `/api/auth/me` | GET, PATCH |
| `/api/auth/admin/analytics` | GET — requireAdmin, launch-readiness funnel (onboarding/перший Space/перший Memory, active 7d/30d, signups by day) — з існуючих timestamp-полів, без окремого event-трекінгу |
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
| `/api/watchlist/import/parse` | POST (multipart) — парсинг CSV/XLSX, повертає headers + rows + suggestedMapping |
| `/api/watchlist/import/confirm` | POST JSON — bulk insert з TMDB-збагаченням; `{ rows, mapping }` → `{ imported, skipped, duplicates, errors }` |
| `/api/watchlist/import/parse-ai` | POST (multipart) — AI-розпізнавання PDF/зображень через Anthropic Vision |
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
| `/api/mood` | GET ?from=&to= — власні логи, PUT /:date (upsert score/note), PATCH /:date/note, DELETE /:date |
| `/api/mood/family/today` | GET — сьогоднішній настрій+нотатка прийнятих сімейних профілів |
| `/api/mood/family/:date` | GET — те саме за довільну дату (тап на день в MoodCalendar) |
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
| `/api/football/standings` | GET `?competition=PL\|PD\|BL1\|SA\|FL1\|CL` — турнірна таблиця, кеш 1г |
| `/api/football/matches` | GET `?competition=...` — найближчий запланований матч, кеш 10хв |
| `/api/weather` | GET ?city= — проксі до wttr.in (Cache-Control 30хв) |
| `/api/user/export` | GET — requireAuth; JSON export всіх даних юзера (без passwordHash/pinHash/tokens/Paddle fields) |
| `/api/user/me` | DELETE — soft delete; вимагає `{ confirmation: 'DELETE' }`; видаляє RefreshTokens, очищає cookie |
| `/api/spaces/:id/vehicle/profile` | GET, PATCH — vehicleProfile sub-document (make/model/year/plate/vin/mileage/fuelType/purchaseDate/photoUrl/nextServiceMileage) |
| `/api/spaces/:id/vehicle/events` | GET (`?type=&limit=`), POST — VehicleEvent CRUD |
| `/api/spaces/:id/vehicle/events/:eventId` | PATCH, DELETE |
| `/api/spaces/:id/vehicle/stats` | GET — totalCostMonth/Year, avgFuelConsumption, costPerKm, currentMileage, expiringDocs |
| `/api/spaces/:id/home/profile` | GET, PATCH — homeProfile sub-document (addressLabel/ownershipType/area/floor/moveInDate/photoUrl) |
| `/api/spaces/:id/home/events` | GET (`?type=&limit=`), POST — HomeEvent (repair/payment/purchase/document/inspection/note/photo) |
| `/api/spaces/:id/home/events/:eventId` | PATCH, DELETE |
| `/api/spaces/:id/pet/profile` | GET, PATCH — petProfile sub-document (name/species/breed/birthDate/weight/photo/chip/passport) |
| `/api/spaces/:id/pet/events` | GET (`?type=&limit=`), POST — PetEvent (vet_visit/vaccination/medication/grooming/weight/note) |
| `/api/spaces/:id/pet/events/:eventId` | PATCH, DELETE |
| `/api/spaces/:id/trip/profile` | GET, PATCH — tripProfile sub-document (destination/startDate/endDate/travelers/status) |
| `/api/ai/space-chat` | POST — SSE streaming (Claude Haiku), system prompt залежить від space.type (vehicle→механік, trip→travel planner, project→PM); контекст: назва/тип + останні 5 подій/задач/нотаток |
| `/api/mimir/hint` | GET `?mode=wise\|witty\|dark` — AI-підказка Міміра (requireFeature('mimirAi')) |
| `/api/billing/checkout` | POST (auth) — генерація WayForPay payment URL, HMAC підпис; повертає `{ paymentUrl, orderReference }` |
| `/api/billing/wayforpay/callback` | POST (public) — HMAC-MD5 верифікація, idempotency через ProcessedBillingEvent, оновлення BillingOrder + User.plan |
| `/api/billing/order/:orderReference/status` | GET (auth) — статус BillingOrder для polling |

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
FOOTBALL_DATA_API_KEY=... # football-data.org, безкоштовний токен реєстрації
BILLING_ENABLED=false   # 'true' вмикає entitlement gates; поки false — всі no-op
WAYFORPAY_MERCHANT_LOGIN=...  # (Phase 4B)
WAYFORPAY_SECRET_KEY=...      # (Phase 4B)
```

## Моделі — ключові поля

**User** — `email` (sparse unique), `passwordHash`, `pinHash` (optional), `role: 'admin'|'user'`, `f1Enabled: boolean`, `footballEnabled: boolean` (обидва — feature-флаги модулів на екрані `/f1`, який тепер таб-хаб "Спорт"), `isVerified: boolean` (default false), `verificationToken: string|null`, `resetPasswordToken: string|null`, `resetPasswordExpires: Date|null` (1г TTL), `lastLoginAt: Date|null` (оновлюється при login/register/google/refresh — proxy для "активний юзер"), `salaryDay: number`, `onboardingCompleted: boolean` (default false; `USER_PUBLIC_FIELDS` повертає `?? true` для старих юзерів де поле undefined), `accountStatus: 'active'|'deletion_requested'|'deleted'` (default 'active'), `deletedAt: Date|null` (default null). Білінг-поля: `billingProvider: 'wayforpay'|'paddle'|null`, `billingInterval: 'month'|'year'|null`, `billingOrderId: string|null`, `cancelAtPeriodEnd: boolean` (default false), `lastBillingSyncAt: Date|null`

**BillingOrder** — `userId`, `provider: 'wayforpay'|'paddle'`, `orderReference` (unique, opaque: `mimir_{YYYYMMDD}_{16hex}`), `planId: 'personal'|'couple'|'family'`, `interval: 'month'|'year'`, `amount` (копійки), `currency: 'UAH'`, `status: 'pending'|'paid'|'failed'|'refunded'|'expired'`, `expiresAt`, `paidAt`, `rawProviderPayload`. Indexes: unique orderReference, `{userId, createdAt: -1}`, `{status, expiresAt}` для cleanup cron

**ProcessedBillingEvent** — idempotency таблиця. `provider`, `eventKey` (composite: `{provider}:{orderRef}:{status}:{amount}:{processingDate}`), `processedAt`. Unique compound index `{provider, eventKey}` — захист від дублювання callbacks

**Transaction** — `type: 'income'|'expense'`, `date: string` (не Date), `categoryId` → Category, `source: 'manual'|'monobank'|'csv'`, `tripMemoryId?: string|null` (опційне посилання на trip-спогад для блоку "Витрати в поїздці"), `spaceId?: string|null` (для фільтра `GET /api/transactions?spaceId=`), сортувати по `createdAt`

**Category** — `name`, `icon` (Tabler ti-*), `color` (hex), `userId`, `isDefault`, `isActive`, `parentId` (субкатегорії), `order: number`

**SprintTask** — `weekNumber + year` = ідентифікатор тижня, `type: 'task'|'routine'`, `repeat: string` для звичок, `completionLog[]`, `checklist[]`, `labels[]`, `assignedTo[]`, `deletedAt` (soft-delete), `dueTime?: string` (HH:MM, опційний час дедлайну), `reminderSent: boolean` (анти-дубль для 5-хвилинного reminder-циклу, скидається при зміні `dueDate`/`dueTime`/`nextDue`/`reminder`), `spaceId?: string | null` (simple string ref, не ObjectId — для фільтра `GET /api/sprint/tasks?spaceId=`)

**TodoItem** — `completionHistory: string[]` для стріків, `checklist[]` підзадачі, `repeat` + `nextDue` для звичок, `dueTime?: string`, `reminderSent: boolean`, `timeOfDay?: 'morning'|'afternoon'|'evening'|null` (слот для RoutineRing/TodayHabits)

**WatchlistItem** — `watchedEpisodes: number[]` прогрес серіалу, `watchedWith: string[]` (userId family members), `totalSeasons` з TMDB, `category: 'movie'|'series'|'anime'|'book'|'game'`, `runtimeMin`/`episodeRuntimeMin` — реальна тривалість з TMDB (фільм/епізод, хв) для точного підрахунку годин у WatchlistStatsSheet

**FamilyLink** — `requester: string`, `recipient: string`, `status: 'pending'|'accepted'`. Унікальний compound index `{requester, recipient}`. `getAcceptedFamilyIds(userId)` — shared helper.

**Memory** — `photos[]` subdocument array, `tags: string[]`, `notes: string`, `location: string`, `lat`/`lng: number|null` (для пінів на MemoryMap), `places: IMemoryPlace[]` (`{name, address, lat, lng}` — заклади всередині спогаду, рендеряться окремими пінами на MemoryMap; зберігаються через звичайний `PATCH /api/memories/:id`, **UI додавання ще не реалізований** — поле читається/рендериться, але форми створення place немає), `dateEnd: string|null` (кінець поїздки, default null), `isTrip: boolean` (default false). GET повертає `ownerName` + `ownerAvatarUrl` для сімейних записів.

**Plan** — `status: 'want'|'planned'|'visited'`, `location`, `photos[]`, `withProfiles[]`; при 'visited' конвертується в Memory

**SavingsGoal** — `deposits[]` subdocument array (amount + date), `currentAmount` = сума deposits

**RecurringPayment** — `amountForeign` + `currency: 'UAH'|'USD'|'EUR'` для валютних платежів

**Space** — `name`, `type: 'personal'|'shared'|'trip'|'family'|'friends'|'hobby'|'sports'|'project'|'vehicle'|'home'|'pet'`, `color`, `emoji`, `ownerId`, `members[]`, `archived: boolean` (default false), `coverUrl: string|null`, `budget: number|null`, `budgetCurrency: string` (default 'UAH'). Sub-documents (null якщо не відповідний тип): `vehicleProfile`, `homeProfile`, `petProfile`, `tripProfile`

**VehicleProfile sub-doc** — `make, model, year, plateNumber, vin, currentMileage, fuelType, purchaseDate, photoUrl, nextServiceMileage: number|null`

**VehicleEvent** — `spaceId`, `userId`, `type: 'fuel'|'maintenance'|'repair'|'inspection'|'insurance'|'tire_change'|'document'|'note'`, `date`, `mileage`, `cost`, `currency`, `vendor`, `notes`, `attachments: string[]` (Cloudinary URLs), `liters` (fuel), `fuelType` (fuel), `docType` (document), `docExpiresAt` (document)

**HomeProfile sub-doc** — `addressLabel, ownershipType: 'rent'|'own'|'mortgage', area: number|null, floor: number|null, moveInDate: string|null, photoUrl`

**HomeEvent** — `spaceId`, `userId`, `type: 'repair'|'payment'|'purchase'|'document'|'inspection'|'note'|'photo'`, `date`, `cost`, `currency`, `vendor`, `notes`, `attachments[]`, `docType`, `docExpiresAt`

**PetProfile sub-doc** — `name, species, breed, birthDate: string|null, weight: number|null, photoUrl, chipNumber, passportNumber`

**PetEvent** — `spaceId`, `userId`, `type: 'vet_visit'|'vaccination'|'medication'|'grooming'|'weight'|'note'`, `date`, `cost`, `currency`, `vendor`, `notes`, `weight` (для weight events), `nextDate: string|null`

**TripProfile sub-doc** — `destination, startDate: string|null, endDate: string|null, travelers: string[], status: 'planning'|'ongoing'|'completed'`

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
| **football-data.org** | Футбол — топ-5 європейських ліг + ЛЧ (`PL/PD/BL1/SA/FL1/CL`), стендінги + найближчий матч |
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

## Скрипти міграції

```bash
railway run npx ts-node src/scripts/seedCategories.ts
railway run npx ts-node src/scripts/updateCategoryPalette.ts
```
