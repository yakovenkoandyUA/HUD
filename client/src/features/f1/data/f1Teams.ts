export interface F1TeamInfo {
  name:      string
  hq:        string
  hqFlag:    string
  principal: string
  engine:    string
  logo:      string | null
  carImage:  string | null
  primary:   string
}

/**
 * F1_TEAMS
 * --------
 * Статичний довідник команд поточної сітки (ключ — Jolpica constructorId).
 * Немає жодного підключеного API зі штаб-квартирою/керівником/двигуном —
 * дані фіксовані вручну, потребують перевірки на початку кожного сезону.
 * logo — офіційне лого команди (media.formula1.com), carImage — фолбек-картинка
 * боліда з /public/teams/, якщо офіційного лого ще нема (нові команди на кшталт
 * Audi/Cadillac у медіатеці F1.com станом на цей сезон відсутні).
 */
export const F1_TEAMS: Record<string, F1TeamInfo> = {
  mercedes: {
    name: 'Mercedes-AMG Petronas', hq: 'Бреклі, Велика Британія', hqFlag: '🇬🇧',
    principal: 'Toto Wolff', engine: 'Mercedes', logo: '/teams/logos/mercedes.png', carImage: '/teams/mercedes.png', primary: '#00D2BE',
  },
  ferrari: {
    name: 'Scuderia Ferrari', hq: 'Маранелло, Італія', hqFlag: '🇮🇹',
    principal: 'Fred Vasseur', engine: 'Ferrari', logo: '/teams/logos/ferrari.png', carImage: '/teams/ferrari.png', primary: '#E8002D',
  },
  mclaren: {
    name: 'McLaren', hq: 'Вокінг, Велика Британія', hqFlag: '🇬🇧',
    principal: 'Andrea Stella', engine: 'Mercedes', logo: '/teams/logos/mclaren.png', carImage: '/teams/mclaren.png', primary: '#FF8000',
  },
  red_bull: {
    name: 'Red Bull Racing', hq: 'Мілтон-Кінс, Велика Британія', hqFlag: '🇬🇧',
    principal: 'Laurent Mekies', engine: 'Red Bull Powertrains', logo: '/teams/logos/red_bull.png', carImage: '/teams/redbull.png', primary: '#3671C6',
  },
  racing_bulls: {
    name: 'Racing Bulls', hq: 'Фаенца, Італія', hqFlag: '🇮🇹',
    principal: 'Alan Permane', engine: 'Red Bull Powertrains', logo: '/teams/logos/racing_bulls.png', carImage: '/teams/racing_bulls.png', primary: '#6692FF',
  },
  alpine: {
    name: 'Alpine', hq: 'Енстоун, Велика Британія', hqFlag: '🇬🇧',
    principal: 'Steve Nielsen', engine: 'Mercedes', logo: '/teams/logos/alpine.png', carImage: '/teams/alpine.png', primary: '#FF87BC',
  },
  aston_martin: {
    name: 'Aston Martin', hq: 'Сілверстоун, Велика Британія', hqFlag: '🇬🇧',
    principal: 'Andy Cowell', engine: 'Honda', logo: '/teams/logos/aston_martin.png', carImage: '/teams/aston_martin.png', primary: '#229971',
  },
  williams: {
    name: 'Williams', hq: 'Гроув, Велика Британія', hqFlag: '🇬🇧',
    principal: 'James Vowles', engine: 'Mercedes', logo: '/teams/logos/williams.png', carImage: '/teams/williams.png', primary: '#64C4FF',
  },
  haas: {
    name: 'Haas F1 Team', hq: 'Банбері, Велика Британія', hqFlag: '🇬🇧',
    principal: 'Ayao Komatsu', engine: 'Ferrari', logo: '/teams/logos/haas.png', carImage: '/teams/haas.png', primary: '#B6BABD',
  },
  audi: {
    name: 'Audi', hq: 'Хінвіль, Швейцарія', hqFlag: '🇨🇭',
    principal: 'Mattia Binotto', engine: 'Audi', logo: null, carImage: null, primary: '#BB0000',
  },
  cadillac: {
    name: 'Cadillac F1 Team', hq: 'Сілверстоун, Велика Британія', hqFlag: '🇬🇧',
    principal: 'Graeme Lowdon', engine: 'Ferrari', logo: null, carImage: null, primary: '#C0C0C0',
  },
}
