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
| `/api/auth/profiles` | GET — public list (legacy) |
| `/api/auth/select` | POST — username-only (legacy) |
| `/api/auth/me` | GET, PATCH |
| `/api/family` | GET — { accepted, pendingSent, pendingReceived } |
| `/api/family/search` | GET ?q=username |
| `/api/family/request` | POST — { recipientId } |
| `/api/family/accept/:linkId` | POST |
| `/api/family/:linkId` | DELETE |
| `/api/transactions` | GET, POST |
| `/api/transactions/:id` | DELETE |
| `/api/sprint/tasks` | GET, POST |
| `/api/sprint/tasks/:id` | PATCH, DELETE |
| `/api/sprint/todos` | GET, POST |
| `/api/sprint/todos/:id` | PATCH, DELETE |
| `/api/goals` | GET, POST |
| `/api/goals/:id` | PATCH, DELETE |
| `/api/watchlist` | GET, POST |
| `/api/watchlist/:id` | PATCH, DELETE |
| `/api/watchlist/:id/comments` | GET, POST |
| `/api/recipes` | GET, POST |
| `/api/recipes/:id` | PUT, DELETE |
| `/api/memories` | GET, POST |
| `/api/memories/:id` | PATCH, DELETE |
| `/api/memories/:id/photos` | POST |
| `/api/memories/:id/photos/:photoId` | PATCH, DELETE |
| `/api/categories` | GET, POST |
| `/api/categories/:id` | PATCH, DELETE |
| `/api/receipt/scan` | POST |
| `/api/recurring` | GET, POST |
| `/api/recurring/:id` | PATCH, DELETE |
| `/api/shopping` | GET, POST |
| `/api/shopping/:id` | PATCH, DELETE |
| `/api/labels` | GET, POST |
| `/api/labels/:id` | PATCH, DELETE |
| `/api/books/search` | GET (proxy Google Books, кеш 10хв) |
| `/api/f1/predictions` | GET, POST, PATCH |

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
```

## Моделі — ключові поля

**Transaction** — `type: 'income'|'expense'`, `date: string` (не Date), `categoryId` → Category, сортувати по `createdAt`

**SprintTask** — `weekNumber + year` = ідентифікатор тижня, `type: 'task'|'routine'`, `repeat: string` для рутин

**TodoItem** — `completionHistory: string[]` для стріків, `checklist[]` підзадачі, `repeat` + `nextDue` для рутин

**WatchlistItem** — `watchedEpisodes: number[]` прогрес серіалу, `watchedWith: string[]` (userId family members — замінив `watchTogether`), `totalSeasons` з TMDB

**FamilyLink** — `requester: string`, `recipient: string`, `status: 'pending'|'accepted'`. Унікальний compound index `{requester, recipient}`. `getAcceptedFamilyIds(userId)` — shared helper для ізоляції даних.

**Memory** — `photos[]` subdocument array, `tags: string[]`, `notes: string`. GET повертає `ownerName` + `ownerAvatarUrl` для сімейних записів.

**Plan** — `status: 'want'|'planned'|'visited'`; при 'visited' конвертується в Memory

**SavingsGoal** — `deposits[]` subdocument array (amount + date), `currentAmount` = сума deposits

**RecurringPayment** — `amountForeign` + `currency: 'UAH'|'USD'|'EUR'` для валютних платежів

**User** — `email` (sparse unique), `passwordHash`, `pinHash` (optional), `role: 'admin'|'user'`, `f1Enabled: boolean`, `isVerified: boolean` (default false), `verificationToken: string|null`. Існуючі профілі без email/password можна "заклеймити" через POST /auth/register з тим самим username. Email verification через Resend (RESEND_API_KEY env). Google OAuth users: isVerified=false до явного підтвердження (але вже мають валідний email).

## Зовнішні API (frontend)

| API | Використання |
|-----|-------------|
| **OpenF1 API** | F1 live data (`api.openf1.org/v1/`) |
| **Jolpica API** | F1 залік команд/пілотів |
| **TMDB API** | Пошук фільмів/серіалів |
| **Google Books** | Пошук книг (через backend proxy) |
| **Cloudinary** | Upload фото (unsigned preset) |
| **Pollinations.ai** | Генерація постерів для спогадів |
| **OpenStreetMap Nominatim** | Геокодування локацій для планів |

## Сідинг

```bash
railway run npx ts-node src/scripts/seedUsers.ts
railway run npx ts-node src/scripts/migrateToKotka.ts
```
