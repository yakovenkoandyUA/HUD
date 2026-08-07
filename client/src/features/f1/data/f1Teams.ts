export interface F1TeamInfo {
  name:      string
  hq:        string
  hqFlag:    string
  principal: string
  engine:    string
  logo:      string | null
  primary:   string
}

/**
 * F1_TEAMS
 * --------
 * Статичний довідник команд поточної сітки (ключ — Jolpica constructorId).
 * Немає жодного підключеного API зі штаб-квартирою/керівником/двигуном —
 * дані фіксовані вручну, потребують перевірки на початку кожного сезону.
 * logo — брендовані картинки лого команд у /public/f1-logo/.
 */
export const F1_TEAMS: Record<string, F1TeamInfo> = {
  mercedes: {
    name: 'Mercedes-AMG Petronas', hq: 'Бреклі, Велика Британія', hqFlag: '🇬🇧',
    principal: 'Toto Wolff', engine: 'Mercedes', logo: '/f1-logo/mercedes.png', primary: '#00D2BE',
  },
  ferrari: {
    name: 'Scuderia Ferrari', hq: 'Маранелло, Італія', hqFlag: '🇮🇹',
    principal: 'Fred Vasseur', engine: 'Ferrari', logo: '/f1-logo/ferrari.png', primary: '#E8002D',
  },
  mclaren: {
    name: 'McLaren', hq: 'Вокінг, Велика Британія', hqFlag: '🇬🇧',
    principal: 'Andrea Stella', engine: 'Mercedes', logo: '/f1-logo/mclaren.png', primary: '#FF8000',
  },
  red_bull: {
    name: 'Red Bull Racing', hq: 'Мілтон-Кінс, Велика Британія', hqFlag: '🇬🇧',
    principal: 'Laurent Mekies', engine: 'Red Bull Powertrains', logo: '/f1-logo/red_bull.png', primary: '#3671C6',
  },
  racing_bulls: {
    name: 'Racing Bulls', hq: 'Фаенца, Італія', hqFlag: '🇮🇹',
    principal: 'Alan Permane', engine: 'Red Bull Powertrains', logo: '/f1-logo/racing_bulls.png', primary: '#6692FF',
  },
  alpine: {
    name: 'Alpine', hq: 'Енстоун, Велика Британія', hqFlag: '🇬🇧',
    principal: 'Steve Nielsen', engine: 'Mercedes', logo: '/f1-logo/alpine.png', primary: '#FF87BC',
  },
  aston_martin: {
    name: 'Aston Martin', hq: 'Сілверстоун, Велика Британія', hqFlag: '🇬🇧',
    principal: 'Andy Cowell', engine: 'Honda', logo: '/f1-logo/aston_martin.png', primary: '#229971',
  },
  williams: {
    name: 'Williams', hq: 'Гроув, Велика Британія', hqFlag: '🇬🇧',
    principal: 'James Vowles', engine: 'Mercedes', logo: '/f1-logo/williams.png', primary: '#64C4FF',
  },
  haas: {
    name: 'Haas F1 Team', hq: 'Банбері, Велика Британія', hqFlag: '🇬🇧',
    principal: 'Ayao Komatsu', engine: 'Ferrari', logo: '/f1-logo/haas.png', primary: '#B6BABD',
  },
  audi: {
    name: 'Audi', hq: 'Хінвіль, Швейцарія', hqFlag: '🇨🇭',
    principal: 'Mattia Binotto', engine: 'Audi', logo: '/f1-logo/audi.png', primary: '#BB0000',
  },
  cadillac: {
    name: 'Cadillac F1 Team', hq: 'Сілверстоун, Велика Британія', hqFlag: '🇬🇧',
    principal: 'Graeme Lowdon', engine: 'Ferrari', logo: '/f1-logo/cadillac.png', primary: '#C0C0C0',
  },
}
