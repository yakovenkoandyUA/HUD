export interface F1Race {
  round: number
  name: string
  circuit: string
  date: string      // ISO: 'YYYY-MM-DD' — дата гонки (неділя)
  flag: string      // emoji прапора
  country: string
  sprint?: boolean
}

export const F1_SEASON_2026: F1Race[] = [
  { round: 1,  name: 'Australian GP',          circuit: 'Albert Park',                  date: '2026-03-08', flag: '🇦🇺', country: 'Australia' },
  { round: 2,  name: 'Chinese GP',             circuit: 'Shanghai',                     date: '2026-03-15', flag: '🇨🇳', country: 'China',       sprint: true },
  { round: 3,  name: 'Japanese GP',            circuit: 'Suzuka',                       date: '2026-03-29', flag: '🇯🇵', country: 'Japan' },
  { round: 4,  name: 'Miami GP',               circuit: 'Miami International',          date: '2026-05-03', flag: '🇺🇸', country: 'USA',         sprint: true },
  { round: 5,  name: 'Canadian GP',            circuit: 'Circuit Gilles Villeneuve',    date: '2026-05-24', flag: '🇨🇦', country: 'Canada',      sprint: true },
  { round: 6,  name: 'Monaco GP',              circuit: 'Circuit de Monaco',            date: '2026-06-07', flag: '🇲🇨', country: 'Monaco' },
  { round: 7,  name: 'Barcelona-Catalunya GP', circuit: 'Circuit de Barcelona',         date: '2026-06-14', flag: '🇪🇸', country: 'Spain' },
  { round: 8,  name: 'Austrian GP',            circuit: 'Red Bull Ring',                date: '2026-06-28', flag: '🇦🇹', country: 'Austria' },
  { round: 9,  name: 'British GP',             circuit: 'Silverstone',                  date: '2026-07-05', flag: '🇬🇧', country: 'UK',          sprint: true },
  { round: 10, name: 'Belgian GP',             circuit: 'Spa-Francorchamps',            date: '2026-07-19', flag: '🇧🇪', country: 'Belgium' },
  { round: 11, name: 'Hungarian GP',           circuit: 'Hungaroring',                  date: '2026-07-26', flag: '🇭🇺', country: 'Hungary' },
  { round: 12, name: 'Dutch GP',               circuit: 'Zandvoort',                    date: '2026-08-23', flag: '🇳🇱', country: 'Netherlands', sprint: true },
  { round: 13, name: 'Italian GP',             circuit: 'Monza',                        date: '2026-09-06', flag: '🇮🇹', country: 'Italy' },
  { round: 14, name: 'Spanish GP — Madrid',    circuit: 'Madring',                      date: '2026-09-13', flag: '🇪🇸', country: 'Spain' },
  { round: 15, name: 'Azerbaijan GP',          circuit: 'Baku City Circuit',            date: '2026-09-26', flag: '🇦🇿', country: 'Azerbaijan' },
  { round: 16, name: 'Singapore GP',           circuit: 'Marina Bay',                   date: '2026-10-11', flag: '🇸🇬', country: 'Singapore',   sprint: true },
  { round: 17, name: 'United States GP',       circuit: 'Circuit of the Americas',      date: '2026-10-25', flag: '🇺🇸', country: 'USA' },
  { round: 18, name: 'Mexico City GP',         circuit: 'Autodromo Hermanos Rodriguez', date: '2026-11-01', flag: '🇲🇽', country: 'Mexico' },
  { round: 19, name: 'São Paulo GP',           circuit: 'Interlagos',                   date: '2026-11-08', flag: '🇧🇷', country: 'Brazil' },
  { round: 20, name: 'Las Vegas GP',           circuit: 'Las Vegas Strip',              date: '2026-11-21', flag: '🇺🇸', country: 'USA' },
  { round: 21, name: 'Qatar GP',               circuit: 'Losail International',         date: '2026-11-29', flag: '🇶🇦', country: 'Qatar' },
  { round: 22, name: 'Abu Dhabi GP',           circuit: 'Yas Marina',                   date: '2026-12-06', flag: '🇦🇪', country: 'UAE' },
]
