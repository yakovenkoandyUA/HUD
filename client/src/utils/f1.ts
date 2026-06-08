import type { F1Race } from '../data/f1Season2026'

const F1_HEADSHOTS_2026: Record<string, string> = {
  antonelli: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/A/ANDANT01_Andrea_Kimi_Antonelli/andant01.png',
  russell:   'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/G/GEORUS01_George_Russell/georus01.png',
  leclerc:   'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/C/CHALEC16_Charles_Leclerc/chalec16.png',
  hamilton:  'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/L/LEWHAM01_Lewis_Hamilton/lewham01.png',
  verstappen:'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/M/MAXVER01_Max_Verstappen/maxver01.png',
  lawson:    'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/L/LIALAW01_Liam_Lawson/lialaw01.png',
  norris:    'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/L/LANNOR04_Lando_Norris/lannor04.png',
  piastri:   'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/O/OSCPIA81_Oscar_Piastri/oscpia81.png',
  alonso:    'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/F/FERALO14_Fernando_Alonso/feralo14.png',
  stroll:    'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/L/LANSTR18_Lance_Stroll/lanstr18.png',
  gasly:     'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/P/PIEGAS10_Pierre_Gasly/piegas10.png',
  doohan:    'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/J/JACDO007_Jack_Doohan/jacdo007.png',
  colapinto: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/F/FRAcol43_Franco_Colapinto/fracol43.png',
  albon:     'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/A/ALEXAL23_Alexander_Albon/alexal23.png',
  sainz:     'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/C/CARSAI55_Carlos_Sainz/carsai55.png',
  ocon:      'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/E/ESTOCO31_Esteban_Ocon/estoco31.png',
  hulkenberg:'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/N/NICHUL27_Nico_Hulkenberg/nichul27.png',
  bearman:   'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/O/OLIBEA38_Oliver_Bearman/olibea38.png',
  tsunoda:   'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/Y/YUKTSU22_Yuki_Tsunoda/yuktsu22.png',
  hadjar:    'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/I/ISAHAD27_Isack_Hadjar/isahad27.png',
  bottas:    'https://media.formula1.com/image/upload/f_auto/q_auto/v1/content/dam/fom-website/drivers/V/VALBOT77_Valtteri_Bottas/valbot77.png',
}

export function getDriverHeadshot(driverId: string): string | null {
  return F1_HEADSHOTS_2026[driverId.toLowerCase().trim()] ?? null
}

export function getNextRace(races: F1Race[]): F1Race | null {
  const today = new Date().toISOString().slice(0, 10)
  return races.find((r) => r.date >= today) ?? null
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getRaceThisWeek(races: F1Race[]): F1Race | null {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const dow = today.getDay()
  const mon = new Date(today); mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  const sun = new Date(mon);   sun.setDate(mon.getDate() + 6)
  const monStr = localDateStr(mon)
  const sunStr = localDateStr(sun)
  return races.find(r => r.date >= monStr && r.date <= sunStr) ?? null
}

export function getDaysToRace(race: F1Race): number {
  const diff = new Date(race.date + 'T14:00:00Z').getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

export function getNextRound(races: F1Race[]): number {
  const next = getNextRace(races)
  return next?.round ?? races.length + 1
}
