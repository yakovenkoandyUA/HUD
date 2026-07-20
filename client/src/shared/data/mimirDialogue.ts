import type { MimirPose } from '@/shared/components/ui/MimirHint'
import type { MimirMode } from '@/shared/store/uiStore'

export type MimirDialogueId =
  | 'finance_empty'
  | 'memories_empty'
  | 'watchlist_empty'
  | 'sprint_empty'
  | 'dashboard_first_visit'
  | 'dashboard_daily_greeting'
  | 'task_overdue'
  | 'task_first_completed'
  | 'sprint_all_completed'
  | 'achievement_first'
  | 'achievement_rare'

export type DialogueFrequency =
  | 'once_per_account'
  | 'once_per_day'
  | 'once_per_week'
  | 'once_per_rare_achievement_id'

export interface MimirDialogueEntry {
  id: MimirDialogueId
  pose: MimirPose
  frequency: DialogueFrequency
  wise: string
  witty: string
  dark: string
}

export const MIMIR_DIALOGUE: Record<MimirDialogueId, MimirDialogueEntry> = {
  finance_empty: {
    id: 'finance_empty',
    pose: 'pointing',
    frequency: 'once_per_day',
    wise:  'Тут поки тихо. Додай першу витрату або надходження — і я почну бачити рух грошей.',
    witty: 'Гроші точно кудись рухаються. Просто тут вони поки старанно приховують сліди.',
    dark:  'Жодної транзакції. Гроші зникають і без записів, але принаймні так вони не залишають слідів.',
  },
  memories_empty: {
    id: 'memories_empty',
    pose: 'shrug',
    frequency: 'once_per_day',
    wise:  'Криниця пам\'яті ще порожня. Одного спогаду достатньо, щоб у неї з\'явилася глибина.',
    witty: 'Жодного спогаду. Або життя було бездоганно спокійним, або архіваріус знову запізнився.',
    dark:  'Тут нічого не збережено. Те, що не записане, з часом переконує нас, ніби його й не було.',
  },
  watchlist_empty: {
    id: 'watchlist_empty',
    pose: 'shrug',
    frequency: 'once_per_day',
    wise:  'Медіатека чекає на першу історію. Додай те, що хочеш побачити або запам\'ятати.',
    witty: 'Список порожній. Рідкісний момент, коли алгоритми ще не вирішили, що тобі дивитися.',
    dark:  'Жодної історії в черзі. Екран мовчить, поки ти не обереш, чим заповнити наступні години.',
  },
  sprint_empty: {
    id: 'sprint_empty',
    pose: 'pointing',
    frequency: 'once_per_day',
    wise:  'Цей тиждень ще не має напрямку. Одна задача вже перетворить порожній простір на шлях.',
    witty: 'Тиждень без задач. Або ти досяг просвітлення, або список просто ще не отримав поганих новин.',
    dark:  'На цей тиждень нічого не заплановано. Час усе одно мине — просто без зафіксованого наміру.',
  },
  dashboard_first_visit: {
    id: 'dashboard_first_visit',
    pose: 'excited',
    frequency: 'once_per_account',
    wise:  'Я — Мімір. Зберігатиму поруч те, що легко губиться: плани, гроші, спогади й зв\'язки між ними.',
    witty: 'Я — Мімір. Ти приносиш хаос, я роблю вигляд, що це система. Зазвичай спрацьовує.',
    dark:  'Я — Мімір. Пам\'ять ненадійна, час байдужий, а порядок не виникає сам. Тож почнемо.',
  },
  dashboard_daily_greeting: {
    id: 'dashboard_daily_greeting',
    pose: 'idle',
    frequency: 'once_per_day',
    wise:  'Знову разом. Подивімося, що змінилося.',
    witty: 'Знову ти. Добре, хаос уже почав нудьгувати.',
    dark:  'Ще один день уже рухається. Подивімося, що він залишив.',
  },
  task_overdue: {
    id: 'task_overdue',
    pose: 'alarmed',
    frequency: 'once_per_day',
    wise:  'Одна задача вже перейшла свій дедлайн. Вона все ще чекає на рішення, а не на докори.',
    witty: 'Ця задача прострочена. Вона вже не нагадування — вона повноправний мешканець списку.',
    dark:  'Дедлайн цієї задачі минув. Невиконана дія не зникає — вона лише стає старшою.',
  },
  task_first_completed: {
    id: 'task_first_completed',
    pose: 'success',
    frequency: 'once_per_week',
    wise:  'Перша задача тижня завершена. Шлях уже не порожній — на ньому з\'явився перший слід.',
    witty: 'Перша задача готова. Тиждень офіційно втратив право називати тебе бездіяльним.',
    dark:  'Перша задача закрита. Невелика перемога, але хаос уже став на одну дію меншим.',
  },
  sprint_all_completed: {
    id: 'sprint_all_completed',
    pose: 'celebrating',
    frequency: 'once_per_week',
    wise:  'Усі задачі тижня завершені. Цей спринт можна залишити позаду без незакритих слідів.',
    witty: 'Усе виконано. Підозріло чистий список — я навіть перевірив, чи він не зламався.',
    dark:  'Список порожній не через забуття, а через завершення. Рідкісний і цілком заслужений порядок.',
  },
  achievement_first: {
    id: 'achievement_first',
    pose: 'excited',
    frequency: 'once_per_account',
    wise:  'Перше досягнення розблоковано. Малий знак, але саме з таких знаків починається довгий шлях.',
    witty: 'Перше досягнення твоє. Система вже вражена — хоча намагається тримати професійне обличчя.',
    dark:  'Перше досягнення здобуто. Тепер у твоєму прогресі є доказ, а не лише добрі наміри.',
  },
  achievement_rare: {
    id: 'achievement_rare',
    pose: 'celebrating',
    frequency: 'once_per_rare_achievement_id',
    wise:  'Це рідкісне досягнення. Ти дістався туди, де більшість шляхів зазвичай обривається.',
    witty: 'Рідкісне досягнення відкрито. Тепер можна скромно вдавати, що все сталося випадково.',
    dark:  'Цю відзнаку отримують небагато. Цього разу виняток має твоє ім\'я.',
  },
}

/** Resolve dialogue text for the given personality mode, falling back to 'wise'. */
export function getMimirText(id: MimirDialogueId, mode: MimirMode): string {
  const entry = MIMIR_DIALOGUE[id]
  if (!entry) return ''
  return entry[mode] ?? entry.wise
}
