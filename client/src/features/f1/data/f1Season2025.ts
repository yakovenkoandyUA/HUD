export interface F1Race {
  round: number
  name: string
  circuit: string
  date: string
  flag: string
  country: string
}

export const F1_SEASON_2025: F1Race[] = [
  { round: 1,  name: 'Australian GP',     circuit: 'Albert Park',                 date: '2025-03-16', flag: '🇦🇺', country: 'Australia' },
  { round: 2,  name: 'Chinese GP',        circuit: 'Shanghai',                    date: '2025-03-23', flag: '🇨🇳', country: 'China' },
  { round: 3,  name: 'Japanese GP',       circuit: 'Suzuka',                      date: '2025-04-06', flag: '🇯🇵', country: 'Japan' },
  { round: 4,  name: 'Bahrain GP',        circuit: 'Bahrain International',       date: '2025-04-13', flag: '🇧🇭', country: 'Bahrain' },
  { round: 5,  name: 'Saudi Arabian GP',  circuit: 'Jeddah Corniche',             date: '2025-04-20', flag: '🇸🇦', country: 'Saudi Arabia' },
  { round: 6,  name: 'Miami GP',          circuit: 'Miami International',         date: '2025-05-04', flag: '🇺🇸', country: 'USA' },
  { round: 7,  name: 'Emilia Romagna GP', circuit: 'Imola',                       date: '2025-05-18', flag: '🇮🇹', country: 'Italy' },
  { round: 8,  name: 'Monaco GP',         circuit: 'Circuit de Monaco',           date: '2025-05-25', flag: '🇲🇨', country: 'Monaco' },
  { round: 9,  name: 'Spanish GP',        circuit: 'Circuit de Barcelona',        date: '2025-06-01', flag: '🇪🇸', country: 'Spain' },
  { round: 10, name: 'Canadian GP',       circuit: 'Circuit Gilles Villeneuve',   date: '2025-06-15', flag: '🇨🇦', country: 'Canada' },
  { round: 11, name: 'Austrian GP',       circuit: 'Red Bull Ring',               date: '2025-06-29', flag: '🇦🇹', country: 'Austria' },
  { round: 12, name: 'British GP',        circuit: 'Silverstone',                 date: '2025-07-06', flag: '🇬🇧', country: 'UK' },
  { round: 13, name: 'Belgian GP',        circuit: 'Spa-Francorchamps',           date: '2025-07-27', flag: '🇧🇪', country: 'Belgium' },
  { round: 14, name: 'Hungarian GP',      circuit: 'Hungaroring',                 date: '2025-08-03', flag: '🇭🇺', country: 'Hungary' },
  { round: 15, name: 'Dutch GP',          circuit: 'Zandvoort',                   date: '2025-08-31', flag: '🇳🇱', country: 'Netherlands' },
  { round: 16, name: 'Italian GP',        circuit: 'Monza',                       date: '2025-09-07', flag: '🇮🇹', country: 'Italy' },
  { round: 17, name: 'Azerbaijan GP',     circuit: 'Baku City Circuit',           date: '2025-09-21', flag: '🇦🇿', country: 'Azerbaijan' },
  { round: 18, name: 'Singapore GP',      circuit: 'Marina Bay',                  date: '2025-10-05', flag: '🇸🇬', country: 'Singapore' },
  { round: 19, name: 'United States GP',  circuit: 'Circuit of the Americas',     date: '2025-10-19', flag: '🇺🇸', country: 'USA' },
  { round: 20, name: 'Mexico City GP',    circuit: 'Autodromo Hermanos Rodriguez', date: '2025-10-26', flag: '🇲🇽', country: 'Mexico' },
  { round: 21, name: 'São Paulo GP',      circuit: 'Interlagos',                  date: '2025-11-09', flag: '🇧🇷', country: 'Brazil' },
  { round: 22, name: 'Las Vegas GP',      circuit: 'Las Vegas Strip',             date: '2025-11-22', flag: '🇺🇸', country: 'USA' },
  { round: 23, name: 'Qatar GP',          circuit: 'Losail International',        date: '2025-11-30', flag: '🇶🇦', country: 'Qatar' },
  { round: 24, name: 'Abu Dhabi GP',      circuit: 'Yas Marina',                  date: '2025-12-07', flag: '🇦🇪', country: 'UAE' },
]
