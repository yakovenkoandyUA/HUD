export interface CircuitInfo {
  length:    number       // km
  laps:      number
  distance:  number       // km
  turns:     number
  city:      string
  firstRace: number       // year
  lapRecord: { time: string; driver: string; year: number } | null
  mostWins:  { driver: string; count: number } | null
}

export const CIRCUIT_DATA: Record<string, CircuitInfo> = {
  albert_park: {
    length: 5.278, laps: 58, distance: 306.124, turns: 16,
    city: 'Melbourne, Australia', firstRace: 1996,
    lapRecord:  { time: '1:20.235', driver: 'Leclerc',    year: 2022 },
    mostWins:   { driver: 'Schumacher', count: 4 },
  },
  shanghai: {
    length: 5.451, laps: 56, distance: 305.066, turns: 16,
    city: 'Shanghai, China', firstRace: 2004,
    lapRecord:  { time: '1:32.238', driver: 'M.Schumacher', year: 2004 },
    mostWins:   { driver: 'Hamilton', count: 6 },
  },
  suzuka: {
    length: 5.807, laps: 53, distance: 307.471, turns: 18,
    city: 'Suzuka, Japan', firstRace: 1987,
    lapRecord:  { time: '1:30.983', driver: 'Hamilton', year: 2019 },
    mostWins:   { driver: 'Schumacher', count: 6 },
  },
  miami: {
    length: 5.412, laps: 57, distance: 308.326, turns: 19,
    city: 'Miami, USA', firstRace: 2022,
    lapRecord:  { time: '1:29.708', driver: 'Verstappen', year: 2023 },
    mostWins:   { driver: 'Verstappen', count: 3 },
  },
  villeneuve: {
    length: 4.361, laps: 70, distance: 305.270, turns: 13,
    city: 'Montreal, Canada', firstRace: 1978,
    lapRecord:  { time: '1:13.078', driver: 'Bottas',    year: 2019 },
    mostWins:   { driver: 'Schumacher', count: 7 },
  },
  monaco: {
    length: 3.337, laps: 78, distance: 260.286, turns: 19,
    city: 'Monte Carlo, Monaco', firstRace: 1950,
    lapRecord:  { time: '1:12.909', driver: 'Leclerc',  year: 2021 },
    mostWins:   { driver: 'Senna',   count: 6 },
  },
  catalunya: {
    length: 4.675, laps: 66, distance: 308.424, turns: 14,
    city: 'Barcelona, Spain', firstRace: 1991,
    lapRecord:  { time: '1:16.330', driver: 'Verstappen', year: 2022 },
    mostWins:   { driver: 'Schumacher', count: 6 },
  },
  red_bull_ring: {
    length: 4.318, laps: 71, distance: 306.452, turns: 10,
    city: 'Spielberg, Austria', firstRace: 1970,
    lapRecord:  { time: '1:05.619', driver: 'Bottas',    year: 2020 },
    mostWins:   { driver: 'Verstappen', count: 3 },
  },
  silverstone: {
    length: 5.891, laps: 52, distance: 306.198, turns: 18,
    city: 'Northamptonshire, UK', firstRace: 1950,
    lapRecord:  { time: '1:27.097', driver: 'Hamilton', year: 2020 },
    mostWins:   { driver: 'Hamilton', count: 8 },
  },
  spa: {
    length: 7.004, laps: 44, distance: 308.052, turns: 20,
    city: 'Stavelot, Belgium', firstRace: 1950,
    lapRecord:  { time: '1:46.286', driver: 'Bottas',    year: 2018 },
    mostWins:   { driver: 'Schumacher', count: 6 },
  },
  hungaroring: {
    length: 4.381, laps: 70, distance: 306.630, turns: 14,
    city: 'Budapest, Hungary', firstRace: 1986,
    lapRecord:  { time: '1:16.627', driver: 'Hamilton', year: 2020 },
    mostWins:   { driver: 'Hamilton', count: 8 },
  },
  zandvoort: {
    length: 4.259, laps: 72, distance: 306.587, turns: 14,
    city: 'Zandvoort, Netherlands', firstRace: 1952,
    lapRecord:  { time: '1:11.097', driver: 'Verstappen', year: 2023 },
    mostWins:   { driver: 'Verstappen', count: 3 },
  },
  monza: {
    length: 5.793, laps: 53, distance: 306.720, turns: 11,
    city: 'Monza, Italy', firstRace: 1950,
    lapRecord:  { time: '1:21.046', driver: 'Barrichello', year: 2004 },
    mostWins:   { driver: 'Schumacher', count: 5 },
  },
  madrid: {
    length: 5.474, laps: 56, distance: 306.544, turns: 21,
    city: 'Madrid, Spain', firstRace: 2026,
    lapRecord:  null,
    mostWins:   null,
  },
  baku: {
    length: 6.003, laps: 51, distance: 306.049, turns: 20,
    city: 'Baku, Azerbaijan', firstRace: 2017,
    lapRecord:  { time: '1:43.009', driver: 'Verstappen', year: 2023 },
    mostWins:   { driver: 'Verstappen', count: 3 },
  },
  marina_bay: {
    length: 5.063, laps: 61, distance: 308.706, turns: 19,
    city: 'Singapore', firstRace: 2008,
    lapRecord:  { time: '1:35.867', driver: 'Leclerc',  year: 2023 },
    mostWins:   { driver: 'Vettel',  count: 5 },
  },
  americas: {
    length: 5.513, laps: 56, distance: 308.405, turns: 20,
    city: 'Austin TX, USA', firstRace: 2012,
    lapRecord:  { time: '1:36.169', driver: 'Hamilton', year: 2019 },
    mostWins:   { driver: 'Hamilton', count: 6 },
  },
  rodriguez: {
    length: 4.304, laps: 71, distance: 305.354, turns: 17,
    city: 'Mexico City, Mexico', firstRace: 1963,
    lapRecord:  { time: '1:17.774', driver: 'Bottas',    year: 2021 },
    mostWins:   { driver: 'Verstappen', count: 4 },
  },
  interlagos: {
    length: 4.309, laps: 71, distance: 305.879, turns: 15,
    city: 'São Paulo, Brazil', firstRace: 1973,
    lapRecord:  { time: '1:10.540', driver: 'Barrichello', year: 2004 },
    mostWins:   { driver: 'Schumacher', count: 4 },
  },
  vegas: {
    length: 6.120, laps: 50, distance: 306.143, turns: 17,
    city: 'Las Vegas, USA', firstRace: 2023,
    lapRecord:  { time: '1:35.490', driver: 'Leclerc',    year: 2023 },
    mostWins:   { driver: 'Verstappen', count: 2 },
  },
  losail: {
    length: 5.380, laps: 57, distance: 306.760, turns: 16,
    city: 'Lusail, Qatar', firstRace: 2021,
    lapRecord:  { time: '1:24.319', driver: 'Verstappen', year: 2023 },
    mostWins:   { driver: 'Verstappen', count: 3 },
  },
  yas_marina: {
    length: 5.281, laps: 58, distance: 306.183, turns: 16,
    city: 'Abu Dhabi, UAE', firstRace: 2009,
    lapRecord:  { time: '1:26.103', driver: 'Verstappen', year: 2021 },
    mostWins:   { driver: 'Verstappen', count: 4 },
  },
}

// Round number → Jolpica circuit slug (2026 calendar)
export const ROUND_TO_CIRCUIT_ID: Record<number, string> = {
  1:  'albert_park',
  2:  'shanghai',
  3:  'suzuka',
  4:  'miami',
  5:  'villeneuve',
  6:  'monaco',
  7:  'catalunya',
  8:  'red_bull_ring',
  9:  'silverstone',
  10: 'spa',
  11: 'hungaroring',
  12: 'zandvoort',
  13: 'monza',
  14: 'madrid',
  15: 'baku',
  16: 'marina_bay',
  17: 'americas',
  18: 'rodriguez',
  19: 'interlagos',
  20: 'vegas',
  21: 'losail',
  22: 'yas_marina',
}
