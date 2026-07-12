import type { AchievementDef } from './types'

// Elder Futhark runes — 24 symbols for 24 achievements
// Memory: ᚠ ᚢ ᚦ ᚨ ᚱ  |  Spaces: ᚲ ᚷ ᚹ ᚺ ᚾ
// Finance: ᛁ ᛃ ᛇ ᛈ ᛉ  |  Sprint: ᛊ ᛏ ᛒ ᛖ ᛗ  |  Watchlist: ᛚ ᛜ ᛞ ᛟ

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // ── ПАМʼЯТЬ ────────────────────────────────────────────────────────────────
  {
    id: 'first-memory',
    category: 'memory',
    title: 'ПЕРШИЙ СПОГАД',
    description: 'Ти залишив перший слід у криниці.',
    target: 1,
    reward: 10,
    rarity: 'spark',
    rune: 'ᚠ',
  },
  {
    id: 'seven-days-memory',
    category: 'memory',
    title: 'СІМ ДНІВ ПАМʼЯТІ',
    description: "Памʼять не любить поспіх. Вона любить повернення.",
    target: 7,
    reward: 20,
    rarity: 'rune',
    rune: 'ᚢ',
  },
  {
    id: 'memory-with-photo',
    category: 'memory',
    title: 'СПОГАД З ОБРАЗОМ',
    description: 'Не все треба пояснювати словами.',
    target: 1,
    reward: 15,
    rarity: 'spark',
    rune: 'ᚦ',
  },
  {
    id: 'past-memory',
    category: 'memory',
    title: 'ПОВЕРНЕНЕ МИНУЛЕ',
    description: 'Те, що минуло, ще не зникло.',
    target: 1,
    reward: 15,
    rarity: 'spark',
    rune: 'ᚨ',
  },
  {
    id: 'archive-10',
    category: 'memory',
    title: 'АРХІВ ПРОКИНУВСЯ',
    description: 'Криниця вже не порожня.',
    target: 10,
    reward: 30,
    rarity: 'stone',
    rune: 'ᚱ',
    hidden: true,
  },

  // ── ПРОСТОРИ ───────────────────────────────────────────────────────────────
  {
    id: 'first-space',
    category: 'spaces',
    title: 'ПЕРШИЙ ПРОСТІР',
    description: 'У хаосу зʼявилась кімната.',
    target: 1,
    reward: 10,
    rarity: 'spark',
    rune: 'ᚲ',
  },
  {
    id: 'space-with-name',
    category: 'spaces',
    title: 'ДАЙ ІМʼЯ МІСЦЮ',
    description: 'Назване місце легше не загубити.',
    target: 1,
    reward: 15,
    rarity: 'spark',
    rune: 'ᚷ',
  },
  {
    id: 'three-spaces',
    category: 'spaces',
    title: 'ТРИ ПРОСТОРИ',
    description: 'Твоя карта починає мати форму.',
    target: 3,
    reward: 20,
    rarity: 'rune',
    rune: 'ᚹ',
  },
  {
    id: 'living-space',
    category: 'spaces',
    title: 'ЖИВИЙ ПРОСТІР',
    description: 'Простір оживає, коли в ньому щось відбувається.',
    target: 3,
    reward: 20,
    rarity: 'rune',
    rune: 'ᚺ',
  },
  {
    id: 'first-auto',
    category: 'spaces',
    title: 'ПЕРШИЙ АВТОСЛІД',
    description: 'Навіть машина має памʼять. І рахунки.',
    target: 1,
    reward: 20,
    rarity: 'rune',
    rune: 'ᚾ',
    hidden: true,
  },

  // ── ФІНАНСИ ────────────────────────────────────────────────────────────────
  {
    id: 'first-transaction',
    category: 'finance',
    title: 'ПЕРША МОНЕТА',
    description: 'Одна монета — теж початок криниці.',
    target: 1,
    reward: 10,
    rarity: 'spark',
    rune: 'ᛁ',
  },
  {
    id: 'seven-records',
    category: 'finance',
    title: 'СІМ ЗАПИСІВ',
    description: 'Патерни зʼявляються там, де є сліди.',
    target: 7,
    reward: 20,
    rarity: 'rune',
    rune: 'ᛃ',
  },
  {
    id: 'no-fog-day',
    category: 'finance',
    title: 'ДЕНЬ БЕЗ ТУМАНУ',
    description: 'День став видимим.',
    target: 1,
    reward: 15,
    rarity: 'spark',
    rune: 'ᛇ',
  },
  {
    id: 'month-watched',
    category: 'finance',
    title: 'МІСЯЦЬ ПІД НАГЛЯДОМ',
    description: 'Тепер гроші не просто зникають. Вони залишають сліди.',
    target: 20,
    reward: 35,
    rarity: 'root',
    rune: 'ᛈ',
  },
  {
    id: 'first-pattern',
    category: 'finance',
    title: 'ПЕРШИЙ ПАТЕРН',
    description: 'Ти не знайшов відповідь. Але знайшов напрям.',
    target: 1,
    reward: 25,
    rarity: 'stone',
    rune: 'ᛉ',
    hidden: true,
  },

  // ── КВЕСТИ / СПРИНТИ ───────────────────────────────────────────────────────
  {
    id: 'first-quest',
    category: 'sprint',
    title: 'ПЕРША ОБІТНИЦЯ',
    description: 'Слова стали наміром. Небезпечно.',
    target: 1,
    reward: 10,
    rarity: 'spark',
    rune: 'ᛊ',
  },
  {
    id: 'first-step',
    category: 'sprint',
    title: 'ПЕРШИЙ КРОК',
    description: 'Рух почався. Це вже більше, ніж план.',
    target: 1,
    reward: 15,
    rarity: 'spark',
    rune: 'ᛏ',
  },
  {
    id: 'completed-path',
    category: 'sprint',
    title: 'ЗАВЕРШЕНИЙ ШЛЯХ',
    description: 'Не ідеально. Але завершено. Це рідкісніше.',
    target: 1,
    reward: 25,
    rarity: 'stone',
    rune: 'ᛒ',
  },
  {
    id: 'seven-days-fire',
    category: 'sprint',
    title: 'СІМ ДНІВ ВОГНЮ',
    description: 'Воля — це не вибух. Це повторення.',
    target: 7,
    reward: 30,
    rarity: 'root',
    rune: 'ᛖ',
  },
  {
    id: 'return-after-fail',
    category: 'sprint',
    title: 'ПОВЕРНЕННЯ ПІСЛЯ ПРОВАЛУ',
    description: 'Провал не страшний. Страшна втеча.',
    target: 1,
    reward: 30,
    rarity: 'root',
    rune: 'ᛗ',
    hidden: true,
  },

  // ── WATCHLIST / СМАК ───────────────────────────────────────────────────────
  {
    id: 'first-watchlist',
    category: 'watchlist',
    title: 'ПЕРША ПОЗНАЧКА',
    description: 'Смак теж потребує архіву.',
    target: 1,
    reward: 10,
    rarity: 'spark',
    rune: 'ᛚ',
  },
  {
    id: 'watched-completed',
    category: 'watchlist',
    title: 'ПЕРЕГЛЯНУТО',
    description: 'Один намір став досвідом.',
    target: 1,
    reward: 15,
    rarity: 'spark',
    rune: 'ᛜ',
  },
  {
    id: 'not-just-list',
    category: 'watchlist',
    title: 'НЕ ПРОСТО СПИСОК',
    description: 'Ти не просто спожив. Ти сформулював.',
    target: 1,
    reward: 20,
    rarity: 'rune',
    rune: 'ᛞ',
  },
  {
    id: 'taste-archive',
    category: 'watchlist',
    title: 'АРХІВ СМАКУ',
    description: 'Тепер це вже не випадковий список.',
    target: 10,
    reward: 25,
    rarity: 'stone',
    rune: 'ᛟ',
    hidden: true,
  },
]

export const ACHIEVEMENT_MAX_SCORE = ACHIEVEMENT_DEFS.reduce((s, a) => s + a.reward, 0)

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> =
  Object.fromEntries(ACHIEVEMENT_DEFS.map(a => [a.id, a]))

// Key nodes shown on the tree per category tab
// x/y = % of canvas (left/top). Canvas aspect: 1:1.4. Tree image fills top ~70% visible.
// Branch junctions: crown tip (50,7), upper trunk (50,22), main branches (20,34)/(80,34),
// heart (50,47), lower branches (18,66)/(82,66), root base (50,80)
export const TREE_NODES: Record<string, { id: string; x: number; y: number }[]> = {
  all: [
    { id: 'first-memory',      x: 50, y: 7  },  // crown tip
    { id: 'seven-days-memory', x: 50, y: 22 },  // upper trunk
    { id: 'first-space',       x: 20, y: 34 },  // left main branch
    { id: 'seven-records',     x: 80, y: 34 },  // right main branch
    { id: 'first-quest',       x: 50, y: 47 },  // heart
    { id: 'completed-path',    x: 18, y: 66 },  // left lower branch
    { id: 'taste-archive',     x: 82, y: 66 },  // right lower branch
    { id: 'archive-10',        x: 50, y: 80 },  // root base
  ],
  memory: [
    { id: 'first-memory',      x: 50, y: 7  },
    { id: 'seven-days-memory', x: 50, y: 23 },
    { id: 'memory-with-photo', x: 20, y: 38 },
    { id: 'past-memory',       x: 80, y: 38 },
    { id: 'archive-10',        x: 50, y: 72 },
  ],
  spaces: [
    { id: 'first-space',       x: 50, y: 7  },
    { id: 'space-with-name',   x: 50, y: 23 },
    { id: 'three-spaces',      x: 20, y: 38 },
    { id: 'living-space',      x: 80, y: 38 },
    { id: 'first-auto',        x: 50, y: 72 },
  ],
  finance: [
    { id: 'first-transaction', x: 50, y: 7  },
    { id: 'seven-records',     x: 50, y: 23 },
    { id: 'no-fog-day',        x: 20, y: 38 },
    { id: 'month-watched',     x: 80, y: 38 },
    { id: 'first-pattern',     x: 50, y: 72 },
  ],
  sprint: [
    { id: 'first-quest',       x: 50, y: 7  },
    { id: 'first-step',        x: 50, y: 23 },
    { id: 'completed-path',    x: 20, y: 38 },
    { id: 'seven-days-fire',   x: 80, y: 38 },
    { id: 'return-after-fail', x: 50, y: 72 },
  ],
  watchlist: [
    { id: 'first-watchlist',   x: 32, y: 16 },
    { id: 'watched-completed', x: 68, y: 16 },
    { id: 'not-just-list',     x: 20, y: 44 },
    { id: 'taste-archive',     x: 80, y: 44 },
  ],
}

// Connections between tree node indices per category
export const TREE_CONNECTIONS: Record<string, [number, number][]> = {
  all:      [[0,1],[1,2],[1,3],[2,4],[3,4],[4,5],[4,6],[5,7],[6,7]],
  memory:   [[0,1],[1,2],[1,3],[2,4],[3,4]],
  spaces:   [[0,1],[1,2],[1,3],[2,4],[3,4]],
  finance:  [[0,1],[1,2],[1,3],[2,4],[3,4]],
  sprint:   [[0,1],[1,2],[1,3],[2,4],[3,4]],
  watchlist:[[0,2],[1,3],[0,1],[2,3]],
}
