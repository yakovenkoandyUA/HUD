# Дизайн-система HUD

## Теми

6 тем: **RETRO** (default) / **WARM** / **DARK** / **JAPAN** / **HEROES** / **BERRY**
Перемикання через `data-theme` атрибут на `<html>`.
Зберігається в `uiStore` → `localStorage` (ключ `hud-ui`).

```tsx
// uiStore.ts
theme: 'retro' | 'warm' | 'dark' | 'japan' | 'heroes' | 'berry'
setTheme: (theme) => void
```

### RETRO (default)
```css
[data-theme="retro"] {
  --bg: #0d0d0d;  --bg2: #141414;  --bg3: #1c1a18;
  --surface: #201e1b;  --surface2: #272421;
  --border: #2e2b27;  --border2: #3a3630;
  --accent: #B83A2D;  --accent-dim: #7a2720;
  --accent-glow: rgba(184,58,45,0.25);  --accent-soft: rgba(184,58,45,0.12);
  --second: #4E6851;  --second-soft: rgba(78,104,81,0.15);
  --gold: #DCC9A9;  --gold-dim: rgba(220,201,169,0.15);
  --text: #EDE0CC;  --text2: #9a8f82;  --text3: #5c5248;
  --positive: #4E6851;  --negative: #B83A2D;
}
```

### WARM
```css
[data-theme="warm"] {
  --bg: #1a2328;  --bg2: #1f2c33;  --bg3: #24343c;
  --surface: #264653;  --surface2: #2d5060;
  --border: #2f5a69;  --border2: #386070;
  --accent: #E76F51;  --accent-dim: #a84e38;
  --accent-glow: rgba(231,111,81,0.25);  --accent-soft: rgba(231,111,81,0.12);
  --second: #2A9D8F;  --second-soft: rgba(42,157,143,0.15);
  --gold: #E9C46A;  --gold-dim: rgba(233,196,106,0.15);
  --text: #f0ece8;  --text2: #9ab0b8;  --text3: #5a7a82;
  --positive: #2A9D8F;  --negative: #E76F51;
}
```

### DARK
```css
[data-theme="dark"] {
  --bg: #0a0a0a;  --bg2: #111111;  --bg3: #1a1a1a;
  --surface: #1e1e1e;  --surface2: #252525;
  --border: #2a2a2a;  --border2: #333333;
  --accent: #c8102e;  --accent-dim: #8b0b1f;
  --second: #2ecc71;  --second-soft: rgba(46,204,113,0.12);
  --gold: #d4a017;  --gold-dim: rgba(212,160,23,0.15);
  --text: #f0ece8;  --text2: #9a9490;  --text3: #5a5652;
  --positive: #2ecc71;  --negative: #c8102e;
}
```

### JAPAN
```css
[data-theme="japan"] {
  --bg: #F5F0EB;  --bg2: #EDE8E2;  --bg3: #E5DED6;
  --surface: #EDE8E2;  --surface2: #E0D9D0;
  --border: #D5CEC5;  --border2: #C8C0B6;
  --accent: #C8102E;  --accent-dim: #8b0b1f;
  --second: #1a1a1a;  --second-soft: rgba(26,26,26,0.08);
  --gold: #8B7355;  --gold-dim: rgba(139,115,85,0.15);
  --text: #1a1a1a;  --text2: #6b6560;  --text3: #a09890;
  --positive: #2d6a4f;  --negative: #C8102E;
  --font-display: 'Cormorant Garamond', 'Furore', serif;
}
```

### HEROES
```css
[data-theme="heroes"] {
  --bg: #0d0f1a;  --bg2: #111420;  --bg3: #161928;
  --surface: #1e2235;  --surface2: #242840;
  --border: #2e3450;  --border2: #353c5e;
  --accent: #d4a017;  --accent-dim: #9b7510;
  --second: #6a4fc8;  --second-soft: rgba(106,79,200,0.15);
  --gold: #d4a017;  --gold-dim: rgba(212,160,23,0.15);
  --text: #e8d5a0;  --text2: #9a8f70;  --text3: #5c5240;
  --positive: #4a9e5c;  --negative: #c8102e;
}
```

---

## Кросбраузерність — обов'язкові правила

### backdrop-filter — ЗАВЖДИ з `-webkit-` префіксом (Safari/iOS)
```css
/* ✅ ПРАВИЛЬНО */
-webkit-backdrop-filter: blur(8px);
backdrop-filter: blur(8px);

/* ❌ НЕПРАВИЛЬНО — Safariігнорує без префіксу */
backdrop-filter: blur(8px);
```

### color-mix() — підтримується в усіх сучасних браузерах (Chrome 111+, Firefox 113+, Safari 16.2+). Використовувати без застережень.

### dvh/svh — підтримується в усіх сучасних браузерах (2022+). Використовувати без застережень.

### Scrollbar styling — завжди парно:
```css
/* Firefox */
scrollbar-width: thin;
scrollbar-color: var(--border) transparent;
/* Chrome/Safari */
&::-webkit-scrollbar { width: 4px; }
&::-webkit-scrollbar-track { background: transparent; }
&::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
```

---

## Правило CSS змінних

Завжди семантичні змінні — ніколи hex напряму:

```tsx
// ❌
color: '#B83A2D'
// ✅
color: 'var(--accent)'
```

---

## Типографіка

```css
--font-display:  'Furore', 'Oswald', 'Barlow Condensed', sans-serif
--font-ui:       'Oswald', 'Barlow Condensed', sans-serif
--font-body:     'PT Sans', 'Barlow', sans-serif
--font-mono:     'JetBrains Mono', monospace
```

- **Furore** — логотип HUD, великі заголовки, числові hero-значення (баланс, відлік F1)
- **₴** — Barlow Condensed (Furore не підтримує гривню)
- **JetBrains Mono** — числові значення, дати, технічні рядки
- **Barlow Condensed** — навігація, теги, кнопки, підписи

**Кирилиця:** `Furore`, `Barlow Condensed` і `Barlow` не містять кириличних гліфів (перевірено по cmap шрифтів) — будь-який український текст у цих стеках фолбекав на system sans-serif. Тому в `--font-display`/`--font-ui` доданий `Oswald`, а в `--font-body` — `PT Sans` (обидва мають повний кириличний набір, включно з і/ї/є/ґ) перед латинськими шрифтами. `JetBrains Mono` кирилицю підтримує сам.
