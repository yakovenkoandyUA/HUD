# MIMIR — Mascot System

## Brand Formula

> **Thought finds the path. Memory gives it meaning. Drink deep.**

Один Мімір об'єднує обидві функції:
- **Thought** — допомагає структурувати, планувати, діяти
- **Memory** — зберігає контекст, пам'ятає, пов'язує
- **Drink deep** — філософія продукту

---

## Персонаж: Memory Oracle

Єдиний маскот застосунку — **Mimir: Memory Oracle**.

Не помічник, не чат-бот. Він:
- джерело знання і контексту
- присутній повсякденно — у підказках, empty states, чаті
- з'являється в масштабнішій формі у кульмінаційні моменти

Інтенсивність присутності залежить від ситуації — не інший персонаж, а та сама сутність у різних вимірах.

---

## Два режими присутності

### Повсякденний Mimir

Для:
- підказок і hint-bubbles
- AI чату
- empty states
- onboarding
- повідомлень
- успіхів і помилок
- рекомендацій

### Ceremonial Mimir

Для:
- нових рівнів
- великих досягнень
- Yearbook і річних підсумків
- глибоких системних інсайтів
- важливих переходів у продукті

> Не інший персонаж — більш масштабна й потойбічна форма того самого Oracle.

---

## Стани (поточні PNG)

| Файл | Де використовується |
|------|---------------------|
| mimir-idle.png | MimirHint (default) |
| mimir-thinking.png | AiChatSheet (loading) + MimirHint |
| mimir-writing.png | MimirHint + Onboarding |
| mimir-pointing.png | MimirHint + Onboarding + empty states |
| mimir-excited.png | MimirHint (dashboard-welcome) |
| mimir-success.png | MimirHint |
| mimir-shrug.png | MimirHint |
| mimir-alarmed.png | MimirHint |
| mimir-sleeping.png | MimirHint |
| mimir-celebrating.png | MimirHint + Onboarding |
| mimir-skeptical.png | MimirHint |
| mimir-welcome.png | Onboarding крок 1 + крок 5 |
| mimir-location.png | Onboarding крок 2 |
| mimir-notifications.png | Onboarding крок 3 |
| mimir-wise.png | MeMimir (режим wise) |
| mimir-balaghur.png | MeMimir (режим witty) |
| mimir-cynical.png | MeMimir (режим dark) |
| mimir-paralax-dark.png | MeMimir (фон, темні теми) |
| mimir-paralax-light.png | MeMimir (фон, japan/pixel) |
| mimir-empty-finance.png | TransactionList (empty state) |
| mimir-empty-memories.png | memories/index.tsx (empty state) |
| mimir-empty-watchlist.png | watchlist + WatchlistGrid (empty state) |

---

## Нові ілюстрації (в роботі)

Папка `public/mascot/` — нові PNG від Джонні, поступова заміна старих.

| Файл | Статус |
|------|--------|
| huginn/huginn-thinking.png | є, фон прибрано |
| huginn/huginn-idle.png | є, фон прибрано |

> **Концепція двох воронів (Huginn + Muninn)** — відкладена на майбутнє. Зберігається як ідея, не активна задача.

---

## Дизайнерське правило

Мімір не повинен просто стояти поряд із текстом. Він має виконувати одну з трьох функцій:

1. Пояснювати, що сталося.
2. Показувати, що робити далі.
3. Надавати сцені характер або значення.

**Якщо він не робить нічого з цього — це декоративний шум.**

---

## Conceptual Structure

| Element      | Role                                           |
|--------------|------------------------------------------------|
| MIMIR        | The world, the system, the deep source         |
| Mimir        | Memory Oracle — думка, пам'ять, глибина        |
| The Well     | Achievement map і занурення в накопичене життя |
| The Monolith | Вертикальний прогрес і рівні                   |
