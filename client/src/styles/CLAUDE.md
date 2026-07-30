# Дизайн-система MIMIR

## Теми

6 тем: **aurum** / **vellum** (default для нових інсталяцій) / **cyber** / **noir** / **pixel** / **arctic**
Перемикання через `data-theme` атрибут на `<html>`.
Зберігається в `uiStore` → `localStorage` (ключ `hud-ui`).

```tsx
// uiStore.ts
theme: 'aurum' | 'vellum' | 'cyber' | 'noir' | 'pixel' | 'arctic'
setTheme: (theme) => void
```

### aurum
Midnight navy + warm gold accent + wine secondary + antique gold decorative. Класична темна тема MIMIR.
- `--accent` (warm gold #e09a30): CTA, FAB, active nav, selected chips, progress, focus ring
- `--second` (wine): secondary interactive — task-shopping, теплий контраст до gold
- `--gold` (antique gold #d9b45d): ТІЛЬКИ декоративне — заголовки секцій, ранг, досягнення, рейтингові зірки, F1 подіум
- `--text` (ivory), `--text2` (cool blue-gray), `--text3` (muted slate)
- Cinzel font-display для класичної типографіки
```css
[data-theme="aurum"] {
  --bg: #090d18;  --surface: #141a2b;  --surface2: #1b2237;
  --accent: #e09a30;  --accent-dim: #a87020;
  --second: #b94b6a;  --second-soft: rgba(185,75,106,0.20);
  --gold: #d9b45d;  --gold-dim: rgba(217,180,93,0.16);
  --text: #f0eadc;  --text2: #aeb5c8;  --text3: #69738c;
  --border: #2b3550;  --border2: #3a4666;
  --font-display: 'Cinzel', 'Bebas Neue', serif;
}
```

### vellum (default для нових інсталяцій)
Базова світла тема MIMIR — перейменована з `mimir` (v3→v4 migration), бо назва теми дублювала назву самого застосунку. Пергаментний фон, теплий бурштиновий accent (перенесений з відхиленої теми sol), нордична типографіка.
Історія: japan → mimir (v1→v2) → **vellum** (v3→v4).
```css
[data-theme="vellum"] {
  --bg: #f3f0eb;  --surface: #faf8f4;  --surface2: #e9e5df;
  --accent: #d97824;  --accent-dim: #a95518;
  --gold: #9b7740;
  --text: #181a22;  --text2: #5f6470;  --text3: #9297a2;
  --border: #d8d3cb;  --border2: #c5beb4;
  --font-display: 'Furore', 'Oswald', sans-serif;
}
```
F1 banner: **light** (`LIGHT_THEMES = new Set(['pixel', 'vellum'])`)
Без декоративних текстур (жодного body::after/before).

### cyber
Темно-синій неон, рожевий акцент. Кіберпанк.
```css
[data-theme="cyber"] {
  --bg: #06080e;  --surface: #131a2c;  --surface2: #182036;
  --accent: #ff2060;  --accent-dim: #c01848;
  --gold: #f0a020;
  --text: #d8eaf8;  --text2: #5888a8;  --text3: #304858;
}
/* body::before — CRT scanlines; body::after — grid overlay */
```

### noir
Чисто чорний, нейтрально-сірий акцент. Мінімалізм.
```css
[data-theme="noir"] {
  --bg: #080808;  --surface: #1a1a1a;
  --accent: #d0d0d0;  --accent-dim: #888888;
  --gold: #c8c8c8;
  --text: #ebebeb;  --text3: #6a6a6a;
  --border: #303030;  --border2: #464646;
}
```
Finance block: `background: var(--surface)` замість `var(--accent-soft)` (окремий override).

### pixel
Кремовий фон, ретро піксельна типографіка.
```css
[data-theme="pixel"] {
  --bg: #f4efe0;  --surface: #faf6ea;
  --accent: #d42020;  --accent-dim: #a01818;
  --gold: #e8a020;
  --text: #181028;
  --font-display: 'Press Start 2P', monospace;
  --font-ui: 'JetBrains Mono', monospace;
  --font-body: 'PT Sans', sans-serif;
}
/* body::after — scanlines поверх */
```
Іконки SVG у SpacesStrip: `filter: brightness(0) opacity(0.55)` (кремові іконки невидимі).
F1 banner: **light** (`LIGHT_THEMES = new Set(['pixel', 'japan'])`)

### arctic
Темно-синій + блакитний акцент. Холодна ніч.
```css
[data-theme="arctic"] {
  --bg: #1e2330;  --surface: #313a4e;
  --accent: #88c0d0;  --accent-dim: #5e8fa0;
  --gold: #ebcb8b;
  --text: #eceff4;
  --font-display: 'Philosopher', serif;
}
/* body::after — aurora borealis overlay */
```
F1 banner: **dark** (arctic — світлий акцент на темному тлі, але banner використовує темну версію)

---

## Типографіка

```css
--font-display: 'Furore', 'Oswald', 'Barlow Condensed', sans-serif  /* overridden per-theme */
--font-ui:      'Manrope', 'Oswald', 'Barlow Condensed', sans-serif
--font-body:    'PT Sans', 'Barlow', sans-serif
--font-mono:    'JetBrains Mono', monospace
```

### Призначення шрифтів
- **Furore / per-theme override** — логотип MIMIR, великі заголовки hero-числа
- **Manrope** — весь UI текст: кнопки, лейбли, картки, навігація
- **₴** — Barlow Condensed (Furore не підтримує гривню → `var(--font-ui)`)
- **JetBrains Mono** — числові значення, дати, технічні рядки (`var(--font-mono)`)

### Per-theme font-display overrides
| Тема | font-display |
|------|--------------|
| aurum | `'Cinzel', 'Bebas Neue', serif` |
| pixel | `'Press Start 2P', monospace` |
| arctic | `'Philosopher', serif` |
| cyber, noir | успадковує `:root` (`Furore`) |

### Кирилиця
`Furore`, `Barlow Condensed` та `Barlow` — **без кириличних гліфів** (перевірено по cmap). Будь-який текст фолбекав на system sans-serif. Тому в стеках стоять `Oswald` і `PT Sans` (повний кириличний набір, включно з і/ї/є/ґ). `JetBrains Mono` і `Manrope` кирилицю підтримують самі.

---

## Семантичні токени

Всі ці змінні визначені в `:root` у `global.css`. **Міграція завершена** — `color-mix()` в компонентах замінено на токени автоматично (скрипт `scripts/migrate-color-mix.py`).

```css
/* ── Панелі (колір + surface) ── */
--panel-danger-bg,   --panel-danger-border
--panel-success-bg,  --panel-success-border
--panel-warning-bg,  --panel-warning-border
--panel-accent-bg,   --panel-accent-border
--panel-muted-bg

/* ── Поверхні ── */
--card-bg, --card-bg-hover   /* cards */
--nav-bg,  --nav-border      /* bottom nav */

/* ── Base tints (12–14%) ── */
--tint-accent    /* accent  12% transparent */
--tint-danger    /* negative 12% transparent */
--tint-success   /* positive 14% transparent */
--tint-warning   /* orange   12% transparent */
--tint-gold      /* gold     12% transparent */
--tint-muted     /* text3    12% transparent */

/* ── Accent tint scale ── */
--tint-accent-xs   /* 5%  — ghost, ледь помітний */
--tint-accent-sm   /* 8%  — hover bg */
--tint-accent-10   /* 10% */
--tint-accent-md   /* 15% — active bg */
--tint-accent-lg   /* 30% — strong, focus ring */
--tint-accent-xl   /* 40% — selected/pressed */

/* ── Accent-on-surface ── */
--accent-wash      /* accent  6% + surface */
--accent-wash-md   /* accent 10% + surface */
--accent-border-strong  /* accent 30% + border */

/* ── Gold tints ── */
--tint-gold-sm   /* gold 12% + surface */
--tint-gold-md   /* gold 30% transparent */

/* ── Border alpha ── */
--border-alpha-50   /* border 50% transparent */
--border-alpha-60   /* border 60% transparent */

/* ── Second color ── */
--tint-second   /* second 14% + surface2 */

/* ── Взаємодія ── */
--tap-bg       /* press/tap feedback — rgba(0,0,0,0.05) для світлих тем */
--focus-ring   /* keyboard focus outline = var(--accent) */
```

Завжди використовуй семантичні токени замість `color-mix()` в нових компонентах:
```css
/* ❌ */
background: color-mix(in srgb, var(--negative) 8%, var(--surface));
/* ✅ */
background: var(--panel-danger-bg);

/* ❌ */
background: color-mix(in srgb, var(--accent) 30%, transparent);
/* ✅ */
background: var(--tint-accent-lg);
```

---

## Кросбраузерність

### backdrop-filter — ЗАВЖДИ з `-webkit-` префіксом (Safari/iOS)
```css
-webkit-backdrop-filter: blur(8px);
backdrop-filter: blur(8px);
```

### color-mix() — Chrome 111+, Firefox 113+, Safari 16.2+. Використовувати без застережень.

### dvh/svh — підтримується в усіх сучасних браузерах (2022+).

### Scrollbar styling — завжди парно:
```css
scrollbar-width: thin;
scrollbar-color: var(--border) transparent;
&::-webkit-scrollbar { width: 4px; }
&::-webkit-scrollbar-track { background: transparent; }
&::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
```

---

## Правила написання стилів

- **ЗАВЖДИ** `var(--accent)` — ніколи hex напряму
- **ЗАВЖДИ** окрема папка: `ComponentName/index.tsx` + `*.module.css`
- **НЕ** inline styles (крім динамічних значень що залежать від JS)
- **НЕ** `!important`
- Числа/дати — `var(--font-mono)`
- Гривня ₴ — `var(--font-ui)` (Furore не підтримує ₴)
- `backdrop-filter` — ЗАВЖДИ разом з `-webkit-backdrop-filter`
- Акордеони — `max-height` + `opacity` transition, ніколи conditional mount/unmount
