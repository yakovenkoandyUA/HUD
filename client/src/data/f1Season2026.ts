export interface F1Race {
  round: number
  name: string
  circuit: string
  date: string      // ISO: 'YYYY-MM-DD'
  flag: string      // emoji прапора
  country: string
  sprint?: boolean
  trackSvg: string | null  // path to /public/tracks/*.svg, null if unavailable
}

export const F1_SEASON_2026: F1Race[] = [
  { round: 1,  name: 'Australian GP',          circuit: 'Albert Park',                  date: '2026-03-08', flag: '🇦🇺', country: 'Australia',  trackSvg: '/tracks/Australian.svg' },
  { round: 2,  name: 'Chinese GP',             circuit: 'Shanghai',                     date: '2026-03-15', flag: '🇨🇳', country: 'China',       trackSvg: null,                              sprint: true },
  { round: 3,  name: 'Japanese GP',            circuit: 'Suzuka',                       date: '2026-03-29', flag: '🇯🇵', country: 'Japan',       trackSvg: '/tracks/Japanese(suzuka).svg' },
  { round: 4,  name: 'Miami GP',               circuit: 'Miami International',          date: '2026-05-03', flag: '🇺🇸', country: 'USA',         trackSvg: '/tracks/Miami.svg',               sprint: true },
  { round: 5,  name: 'Canadian GP',            circuit: 'Circuit Gilles Villeneuve',    date: '2026-05-24', flag: '🇨🇦', country: 'Canada',      trackSvg: '/tracks/Canadian.svg',            sprint: true },
  { round: 6,  name: 'Monaco GP',              circuit: 'Circuit de Monaco',            date: '2026-06-07', flag: '🇲🇨', country: 'Monaco',      trackSvg: '/tracks/Monaco.svg' },
  { round: 7,  name: 'Barcelona-Catalunya GP', circuit: 'Circuit de Barcelona',         date: '2026-06-14', flag: '🇪🇸', country: 'Spain',       trackSvg: '/tracks/Spanish.svg' },
  { round: 8,  name: 'Austrian GP',            circuit: 'Red Bull Ring',                date: '2026-06-28', flag: '🇦🇹', country: 'Austria',     trackSvg: '/tracks/RedBullRing.svg' },
  { round: 9,  name: 'British GP',             circuit: 'Silverstone',                  date: '2026-07-05', flag: '🇬🇧', country: 'UK',          trackSvg: '/tracks/British(Silverstone).svg', sprint: true },
  { round: 10, name: 'Belgian GP',             circuit: 'Spa-Francorchamps',            date: '2026-07-19', flag: '🇧🇪', country: 'Belgium',     trackSvg: '/tracks/Belgian.svg' },
  { round: 11, name: 'Hungarian GP',           circuit: 'Hungaroring',                  date: '2026-07-26', flag: '🇭🇺', country: 'Hungary',     trackSvg: '/tracks/Hungarian.svg' },
  { round: 12, name: 'Dutch GP',               circuit: 'Zandvoort',                    date: '2026-08-23', flag: '🇳🇱', country: 'Netherlands', trackSvg: '/tracks/Dutch.svg',               sprint: true },
  { round: 13, name: 'Italian GP',             circuit: 'Monza',                        date: '2026-09-06', flag: '🇮🇹', country: 'Italy',       trackSvg: '/tracks/Italia(monza).svg' },
  { round: 14, name: 'Spanish GP — Madrid',    circuit: 'Madring',                      date: '2026-09-13', flag: '🇪🇸', country: 'Spain',       trackSvg: '/tracks/Madrid.svg' },
  { round: 15, name: 'Azerbaijan GP',          circuit: 'Baku City Circuit',            date: '2026-09-26', flag: '🇦🇿', country: 'Azerbaijan',  trackSvg: '/tracks/Azerbaijan.svg' },
  { round: 16, name: 'Singapore GP',           circuit: 'Marina Bay',                   date: '2026-10-11', flag: '🇸🇬', country: 'Singapore',   trackSvg: '/tracks/Singapore.svg',           sprint: true },
  { round: 17, name: 'United States GP',       circuit: 'Circuit of the Americas',      date: '2026-10-25', flag: '🇺🇸', country: 'USA',         trackSvg: '/tracks/USA(ostin).svg' },
  { round: 18, name: 'Mexico City GP',         circuit: 'Autodromo Hermanos Rodriguez', date: '2026-11-01', flag: '🇲🇽', country: 'Mexico',      trackSvg: '/tracks/Mexican.svg' },
  { round: 19, name: 'São Paulo GP',           circuit: 'Interlagos',                   date: '2026-11-08', flag: '🇧🇷', country: 'Brazil',      trackSvg: '/tracks/Brazilian.svg' },
  { round: 20, name: 'Las Vegas GP',           circuit: 'Las Vegas Strip',              date: '2026-11-21', flag: '🇺🇸', country: 'USA',         trackSvg: '/tracks/LasVegas.svg' },
  { round: 21, name: 'Qatar GP',               circuit: 'Losail International',         date: '2026-11-29', flag: '🇶🇦', country: 'Qatar',       trackSvg: '/tracks/Qatar.svg' },
  { round: 22, name: 'Abu Dhabi GP',           circuit: 'Yas Marina',                   date: '2026-12-06', flag: '🇦🇪', country: 'UAE',         trackSvg: '/tracks/abuDhabi.svg' },
]
