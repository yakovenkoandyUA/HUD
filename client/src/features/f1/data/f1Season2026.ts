export interface F1Race {
  round:      number
  name:       string
  shortName:  string           // compact label for grid cells (supports \n)
  circuit:    string
  date:       string           // ISO: 'YYYY-MM-DD'
  flag:       string           // emoji прапора
  country:    string
  sprint?:    boolean
  trackSvg:   string | null   // path to /public/tracks/*.svg, null if unavailable
  banner?:    string          // path to /public/formula1-banner/*.webp, unique per-GP dashboard banner
  trackStartOffset?: number   // 0-1, fraction along trackSvg's path where the start/finish line sits (draw-animation begins here)
}

export const F1_SEASON_2026: F1Race[] = [
	{ round: 1, name: 'Australian GP', shortName: 'AUSTRALIA', circuit: 'Albert Park', date: '2026-03-08', flag: '🇦🇺', country: 'Australia', trackSvg: '/tracks/Australian.svg', banner: '/formula1-banner/australia.webp' },
	{ round: 2, name: 'Chinese GP', shortName: 'CHINA', circuit: 'Shanghai', date: '2026-03-15', flag: '🇨🇳', country: 'China', trackSvg: '/tracks/China.svg', sprint: true, banner: '/formula1-banner/china.webp', trackStartOffset: 0.43 },
	{ round: 3, name: 'Japanese GP', shortName: 'JAPAN', circuit: 'Suzuka', date: '2026-03-29', flag: '🇯🇵', country: 'Japan', trackSvg: '/tracks/Japanese(suzuka).svg', banner: '/formula1-banner/japan.webp' },
	{ round: 4, name: 'Miami GP', shortName: 'MIAMI', circuit: 'Miami International', date: '2026-05-03', flag: '🇺🇸', country: 'USA', trackSvg: '/tracks/Miami.svg', sprint: true, banner: '/formula1-banner/miami.webp' },
	{ round: 5, name: 'Canadian GP', shortName: 'CANADA', circuit: 'Circuit Gilles Villeneuve', date: '2026-05-24', flag: '🇨🇦', country: 'Canada', trackSvg: '/tracks/Canadian.svg', sprint: true, banner: '/formula1-banner/canada.webp' },
	{ round: 6, name: 'Monaco GP', shortName: 'MONACO', circuit: 'Circuit de Monaco', date: '2026-06-07', flag: '🇲🇨', country: 'Monaco', trackSvg: '/tracks/Monaco.svg', banner: '/formula1-banner/monaco.webp' },
	{ round: 7, name: 'Spanish GP', shortName: 'SPAIN\n(BAR)', circuit: 'Circuit de Barcelona', date: '2026-06-14', flag: '🇪🇸', country: 'Spain', trackSvg: '/tracks/Spanish.svg', banner: '/formula1-banner/spain_barcelona.webp' },
	{ round: 8, name: 'Austrian GP', shortName: 'AUSTRIA', circuit: 'Red Bull Ring', date: '2026-06-28', flag: '🇦🇹', country: 'Austria', trackSvg: '/tracks/RedBullRing.svg', banner: '/formula1-banner/austria.webp' },
	{ round: 9, name: 'British GP', shortName: 'BRITAIN', circuit: 'Silverstone', date: '2026-07-05', flag: '🇬🇧', country: 'UK', trackSvg: '/tracks/British(Silverstone).svg', sprint: true, banner: '/formula1-banner/britain.webp' },
	{ round: 10, name: 'Belgian GP', shortName: 'BELGIUM', circuit: 'Spa-Francorchamps', date: '2026-07-19', flag: '🇧🇪', country: 'Belgium', trackSvg: '/tracks/Belgian.svg', banner: '/formula1-banner/belgium.webp' },
	{ round: 11, name: 'Hungarian GP', shortName: 'HUNGARY', circuit: 'Hungaroring', date: '2026-07-26', flag: '🇭🇺', country: 'Hungary', trackSvg: '/tracks/Hungarian.svg', banner: '/formula1-banner/hungary.webp' },
	{ round: 12, name: 'Dutch GP', shortName: 'NETHERLANDS', circuit: 'Zandvoort', date: '2026-08-23', flag: '🇳🇱', country: 'Netherlands', trackSvg: '/tracks/Dutch.svg', sprint: true, banner: '/formula1-banner/netherland.webp' },
	{ round: 13, name: 'Italian GP', shortName: 'ITALY', circuit: 'Monza', date: '2026-09-06', flag: '🇮🇹', country: 'Italy', trackSvg: '/tracks/Italia(monza).svg', banner: '/formula1-banner/italy_monza.webp' },
	{ round: 14, name: 'Spanish GP', shortName: 'SPAIN\n(MAD)', circuit: 'Circuito de Madring', date: '2026-09-13', flag: '🇪🇸', country: 'Spain', trackSvg: '/tracks/Madrid.svg', banner: '/formula1-banner/spain_madrid.webp' },
	{ round: 15, name: 'Azerbaijan GP', shortName: 'AZERBAIJAN', circuit: 'Baku City Circuit', date: '2026-09-26', flag: '🇦🇿', country: 'Azerbaijan', trackSvg: '/tracks/Azerbaijan.svg', banner: '/formula1-banner/azerbaijan.webp' },
	{ round: 16, name: 'Singapore GP', shortName: 'SINGAPORE', circuit: 'Marina Bay', date: '2026-10-11', flag: '🇸🇬', country: 'Singapore', trackSvg: '/tracks/Singapore.svg', sprint: true, banner: '/formula1-banner/singapore.webp' },
	{ round: 17, name: 'United States GP', shortName: 'USA', circuit: 'Circuit of the Americas', date: '2026-10-25', flag: '🇺🇸', country: 'USA', trackSvg: '/tracks/USA(ostin).svg', banner: '/formula1-banner/usa_ostin.webp' },
	{ round: 18, name: 'Mexico City GP', shortName: 'MEXICO', circuit: 'Autodromo Hermanos Rodriguez', date: '2026-11-01', flag: '🇲🇽', country: 'Mexico', trackSvg: '/tracks/Mexican.svg', banner: '/formula1-banner/mexico.webp' },
	{ round: 19, name: 'São Paulo GP', shortName: 'BRAZIL', circuit: 'Interlagos', date: '2026-11-08', flag: '🇧🇷', country: 'Brazil', trackSvg: '/tracks/Brazilian.svg', banner: '/formula1-banner/brazil.webp' },
	{ round: 20, name: 'Las Vegas GP', shortName: 'LAS VEGAS', circuit: 'Las Vegas Strip', date: '2026-11-21', flag: '🇺🇸', country: 'USA', trackSvg: '/tracks/LasVegas.svg', banner: '/formula1-banner/lasvegas.webp' },
	{ round: 21, name: 'Qatar GP', shortName: 'QATAR', circuit: 'Losail International', date: '2026-11-29', flag: '🇶🇦', country: 'Qatar', trackSvg: '/tracks/Qatar.svg', banner: '/formula1-banner/qatar.webp' },
	{ round: 22, name: 'Abu Dhabi GP', shortName: 'ABU DHABI', circuit: 'Yas Marina', date: '2026-12-06', flag: '🇦🇪', country: 'UAE', trackSvg: '/tracks/abuDhabi.svg', banner: '/formula1-banner/abu_dabi.webp' },
]
