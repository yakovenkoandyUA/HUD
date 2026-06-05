// Approximate UTC race start times for 2026 season.
// Update with official broadcast times when confirmed.
export interface F1RaceSchedule {
  round: number
  name: string
  circuit: string
  // Full ISO datetime in UTC — some night races cross midnight local → UTC next day
  raceUtc: string
}

export const F1_RACES_2026: F1RaceSchedule[] = [
  { round:  1, name: 'Australian GP',          circuit: 'Albert Park',                  raceUtc: '2026-03-08T04:00:00Z' },
  { round:  2, name: 'Chinese GP',             circuit: 'Shanghai',                     raceUtc: '2026-03-15T07:00:00Z' },
  { round:  3, name: 'Japanese GP',            circuit: 'Suzuka',                       raceUtc: '2026-03-29T05:00:00Z' },
  { round:  4, name: 'Miami GP',               circuit: 'Miami International',          raceUtc: '2026-05-03T19:00:00Z' },
  { round:  5, name: 'Canadian GP',            circuit: 'Circuit Gilles Villeneuve',    raceUtc: '2026-05-24T18:00:00Z' },
  { round:  6, name: 'Monaco GP',              circuit: 'Circuit de Monaco',            raceUtc: '2026-06-07T13:00:00Z' },
  { round:  7, name: 'Barcelona-Catalunya GP', circuit: 'Circuit de Barcelona',         raceUtc: '2026-06-14T13:00:00Z' },
  { round:  8, name: 'Austrian GP',            circuit: 'Red Bull Ring',                raceUtc: '2026-06-28T13:00:00Z' },
  { round:  9, name: 'British GP',             circuit: 'Silverstone',                  raceUtc: '2026-07-05T14:00:00Z' },
  { round: 10, name: 'Belgian GP',             circuit: 'Spa-Francorchamps',            raceUtc: '2026-07-19T13:00:00Z' },
  { round: 11, name: 'Hungarian GP',           circuit: 'Hungaroring',                  raceUtc: '2026-07-26T13:00:00Z' },
  { round: 12, name: 'Dutch GP',               circuit: 'Zandvoort',                    raceUtc: '2026-08-23T13:00:00Z' },
  { round: 13, name: 'Italian GP',             circuit: 'Monza',                        raceUtc: '2026-09-06T13:00:00Z' },
  { round: 14, name: 'Spanish GP — Madrid',    circuit: 'Madring',                      raceUtc: '2026-09-13T13:00:00Z' },
  { round: 15, name: 'Azerbaijan GP',          circuit: 'Baku City Circuit',            raceUtc: '2026-09-26T10:00:00Z' },
  { round: 16, name: 'Singapore GP',           circuit: 'Marina Bay',                   raceUtc: '2026-10-11T12:00:00Z' },
  { round: 17, name: 'United States GP',       circuit: 'Circuit of the Americas',      raceUtc: '2026-10-25T20:00:00Z' },
  { round: 18, name: 'Mexico City GP',         circuit: 'Autodromo Hermanos Rodriguez', raceUtc: '2026-11-01T20:00:00Z' },
  { round: 19, name: 'São Paulo GP',           circuit: 'Interlagos',                   raceUtc: '2026-11-08T18:00:00Z' },
  { round: 20, name: 'Las Vegas GP',           circuit: 'Las Vegas Strip',              raceUtc: '2026-11-22T06:00:00Z' },
  { round: 21, name: 'Qatar GP',               circuit: 'Losail International',         raceUtc: '2026-11-29T15:00:00Z' },
  { round: 22, name: 'Abu Dhabi GP',           circuit: 'Yas Marina',                   raceUtc: '2026-12-06T13:00:00Z' },
]
