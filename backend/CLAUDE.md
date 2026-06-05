# Backend HUD

## Стек

- **Node.js** + **Express** — REST API
- **Mongoose** — ODM для MongoDB Atlas (512MB free tier)
- **JWT** — авторизація (profile selection, без пароля), payload: `{ userId, role }`
- **Web Push (VAPID)** — push-нотифікації на Android
- **Деплой** — Railway (`hud-production.up.railway.app`)

## Middleware

- `requireAuth` — перевіряє JWT, додає `req.userId`, `req.userRole`
- `requireAdmin` — 403 якщо `req.userRole !== 'admin'`

## API ендпоінти

| Route | Метод | Опис |
|-------|-------|------|
| `/api/auth/profiles` | GET | Список профілів (публічний) |
| `/api/auth/select` | POST | Видає JWT по username |
| `/api/auth/me` | PATCH | Оновити avatarUrl |
| `/api/transactions` | GET/POST | Транзакції |
| `/api/transactions/:id` | DELETE | Видалити транзакцію |
| `/api/sprint/tasks` | GET/POST | Sprint tasks |
| `/api/sprint/tasks/:id` | PATCH/DELETE | Оновити/видалити task |
| `/api/sprint/todos` | GET/POST | Todo items |
| `/api/sprint/todos/:id` | PATCH/DELETE | Оновити/видалити todo |
| `/api/goals` | GET/POST | Savings goals |
| `/api/goals/:id` | PATCH/DELETE | Оновити/видалити goal |
| `/api/watchlist` | GET/POST | Watchlist items |
| `/api/watchlist/:id` | PATCH/DELETE | Оновити/видалити item |
| `/api/lessons` | GET/POST | Уроки |
| `/api/lessons/:id` | PUT/DELETE | Оновити/видалити урок |
| `/api/recipes` | GET/POST | Особисті рецепти |
| `/api/recipes/:id` | PUT/DELETE | Оновити/видалити рецепт |
| `/api/memories` | GET/POST | Спогади |
| `/api/memories/:id` | PATCH/DELETE | Оновити/видалити спогад |
| `/api/memories/:id/photos` | POST | Додати фото до спогаду |
| `/api/memories/:id/photos/:photoId` | PATCH/DELETE | Оновити/видалити фото |
| `/api/categories` | GET/POST | Кастомні категорії транзакцій |
| `/api/categories/:id` | PATCH/DELETE | Оновити/видалити категорію |
| `/api/receipt/scan` | POST | Сканування чеку (Anthropic Vision API) |
| `/api/recurring` | GET/POST | Регулярні платежі |
| `/api/recurring/:id` | PATCH/DELETE | Оновити/видалити регулярний платіж |
| `/api/shopping` | GET/POST | Список покупок |
| `/api/shopping/:id` | PATCH/DELETE | Оновити/видалити елемент покупок |
| `/api/labels` | GET/POST | Глобальні мітки спринту |
| `/api/labels/:id` | PATCH/DELETE | Оновити/видалити мітку |
| `/api/books/search` | GET | Пошук книг (Google Books proxy, кеш 10 хв) |
| `/api/f1/predictions` | GET/POST/PATCH | F1 прогнози гонок |

## Env змінні

```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
ANTHROPIC_API_KEY=...       # сканування чеків (ReceiptScanner)
GOOGLE_BOOKS_KEY=...        # пошук книг (опціонально, знімає rate limit)
```

## Сідинг бази

```bash
railway run npx ts-node src/scripts/seedUsers.ts      # створює Котька + Коська
railway run npx ts-node src/scripts/migrateToKotka.ts # мігрує дані зі старого userId:'admin'
```

## Зовнішні API (використовуються на frontend)

| API | Використання | Ключ |
|-----|-------------|------|
| **TheMealDB** | Блюдо тижня, рецепти | Не потрібен |
| **NASA APOD** | Astronomy Picture of the Day | Безкоштовний (api.nasa.gov) |
| **OpenF1 API** | Залік пілотів (`/v1/championship_drivers?year=2026`) | Не потрібен |
| **Jolpica API** | Залік команд (`/ergast/f1/current/constructorstandings/`) | Не потрібен |
| **TMDB API** | Пошук фільмів/серіалів у Watchlist | Потрібен ключ |
| **Google Books** | Пошук книг у Watchlist (через backend proxy) | Опціонально (знімає rate limit) |
| **Cloudinary** | Upload аватарів, постерів, фото | unsigned preset |
