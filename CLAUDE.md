# HUD — Personal Organizer PWA

**HUD** (Heads Up Display) — особистий органайзер (фінанси, F1, спринти, менторство, контент).
Назва відсилає до геймінгу, sci-fi та F1 — гік + фанат Формули 1.

---

## Репозиторій

```
/
├── client/   → Vercel (hud-murex.vercel.app)       — React + TypeScript PWA
└── backend/  → Railway (hud-production.up.railway.app) — Node.js + Express + MongoDB
```

**Frontend стек:** React 18, TypeScript, Vite + vite-plugin-pwa, Zustand, React Router v6, CSS Modules, Recharts, Three.js

Деталі по розділах:
- Дизайн-система (теми, змінні, типографіка) → [`client/src/styles/CLAUDE.md`](client/src/styles/CLAUDE.md)
- Компоненти (правила, структура, JSDoc, 3D) → [`client/src/components/CLAUDE.md`](client/src/components/CLAUDE.md)
- Екрани (поведінка кожного screen) → [`client/src/screens/CLAUDE.md`](client/src/screens/CLAUDE.md)
- Стейт (Zustand stores, persist, маппінг) → [`client/src/store/CLAUDE.md`](client/src/store/CLAUDE.md)
- Backend (API, middleware, env, зовнішні API) → [`backend/CLAUDE.md`](backend/CLAUDE.md)

---

## Автентифікація

Мультипрофіль без пароля:
- **Котька** — `role: 'admin'` (F1 екран, повний доступ)
- **Коська** — `role: 'user'` (без F1)

Flow: `/profile-select` → `POST /api/auth/select { username }` → JWT 30 днів → `profileStore` → `localStorage` (`profile-storage`).
Всі запити через `authFetch` з Bearer токеном. Маршрути захищені `ProtectedRoute` / `AdminRoute`.

**Env:**
```
# /client
VITE_API_URL=https://hud-production.up.railway.app
VITE_CLOUDINARY_CLOUD_NAME=mimir-hud
VITE_CLOUDINARY_UPLOAD_PRESET=mimirorg
```

---

## PWA

`vite-plugin-pwa` + `injectManifest` + custom `src/sw.ts`.
`vercel.json` — rewrite all → `index.html` (обов'язково для SPA).
Service Worker підключений до Web Push (VAPID).

---

## Ключові домовленості

1. Кожен компонент — окрема папка `index.tsx` + `*.module.css`
2. JSDoc перед кожним компонентом (опис пропсів перед `interface`)
3. Семантичні CSS змінні — `var(--accent)`, не hex
4. Furore — логотип і hero-числа; ₴ — Barlow Condensed; JetBrains Mono — числа/дати
5. Кнопки — SVG іконка замість символу `+`
6. PriorityBadge — ▲◆▽ + pill, не emoji
7. Sprint фільтр — dropdown-select, дефолт тільки активні задачі
8. Без зайвих залежностей — нативно якщо можливо

---

## Статус (2026-05-27)

**Зроблено:** повний scaffold, дизайн-система (5 тем), всі екрани, backend інтеграція (transactions/sprint/goals/watchlist/lessons/recipes/memories), auth мультипрофіль, PWA, Cloudinary, Three.js.

**Наступне:**
- ⬜ Push-нотифікації (VAPID підключено, логіка відправки не реалізована)
- ⬜ Фінансовий аналітик / менторський помічник (агенти)
