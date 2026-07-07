/**
 * Порівняння інгредієнтів по словах-основах (спільний префікс), а не по цілих
 * рядках. Текст інгредієнтів зберігається у відмінку оригінального рецепту
 * ("курячих філе", "курячого філе") — без цього порівняння пошук "куряче філе"
 * (називний відмінок) не знаходив би жодного збігу.
 */
const PREFIX_LEN = 5
const MIN_PREFIX_WORD_LEN = 4

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[()%]/g, ' ')
    .split(/[^a-zа-яіїєґ'-]+/i)
    .filter(Boolean)
}

function wordMatches(a: string, b: string): boolean {
  if (a.length < MIN_PREFIX_WORD_LEN || b.length < MIN_PREFIX_WORD_LEN) return a === b
  const len = Math.min(PREFIX_LEN, a.length, b.length)
  return a.slice(0, len) === b.slice(0, len)
}

/** Усі слова запиту мають знайти відповідник (за префіксом) серед слів фрази. */
export function phraseMatchesQuery(phraseWords: string[], queryWords: string[]): boolean {
  return queryWords.every(qw => phraseWords.some(pw => wordMatches(qw, pw)))
}

/** Сигнатура фрази для дедуплікації відмінкових варіантів в списку підказок. */
export function tokenSignature(s: string): string {
  return tokenize(s)
    .map(w => (w.length >= MIN_PREFIX_WORD_LEN ? w.slice(0, PREFIX_LEN) : w))
    .sort()
    .join(' ')
}
