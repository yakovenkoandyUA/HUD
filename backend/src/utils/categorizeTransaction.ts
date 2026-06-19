/**
 * Keyword-based auto-categorizer for Monobank transactions.
 * Matches Ukrainian merchant names and MCC-style descriptions.
 */

interface CategoryEntry {
  _id: { toString(): string }
  name: string
}

type CategoryMatch = { name: string; id: string } | null

// Ordered rules — first match wins.
// Patterns are tested case-insensitively against the full description.
const RULES: Array<{ category: string; patterns: RegExp[] }> = [
  {
    category: 'Підписки',
    patterns: [
      /netflix/i,
      /spotify/i,
      /apple\s*(music|tv|one|arcade|icloud|storage)/i,
      /google\s*(one|play|storage)/i,
      /youtube\s*premium/i,
      /disney\+?/i,
      /hbo/i,
      /steam\s*subscription/i,
      /microsoft\s*(365|office)/i,
      /chatgpt/i,
      /openai/i,
      /anthropic/i,
      /claude/i,
      /cursor/i,
      /github\s*(copilot|pro)/i,
      /patreon/i,
      /substack/i,
      /dou\.ua/i,
    ],
  },
  {
    category: 'Продукти',
    patterns: [
      /атб|atb/i,
      /сільпо|silpo/i,
      /фора\b/i,
      /варус|varus/i,
      /novus|новус/i,
      /metro\s*(cash|маркет)?/i,
      /ашан|auchan/i,
      /billa/i,
      /ultramarket/i,
      /zakaz\.ua/i,
      /глобус\b/i,
      /велмарт|wellmart/i,
      /мегамаркет|megamarket/i,
      /produkt/i,
      /супермаркет|supermarket/i,
      /гастроном/i,
      /пиріжок|пироги|bakery|хлібозавод/i,
    ],
  },
  {
    category: 'Заклади',
    patterns: [
      /bolt\s*food/i,
      /glovo/i,
      /uber\s*eats/i,
      /raketa/i,
      /мcdonald|mcdonalds|мак(дак|дональдс)/i,
      /burger\s*king/i,
      /kfc/i,
      /pizza/i,
      /піца|піцерія/i,
      /суші|sushi/i,
      /кафе|кав'ярня|cafe|coffee/i,
      /starbucks/i,
      /domino/i,
      /dim\s*sum/i,
      /shawarma|шаурма/i,
      /їдальня|stolovaya/i,
      /ресторан|restaurant/i,
    ],
  },
  {
    category: 'Транспорт',
    patterns: [
      /bolt\b(?!\s*food)/i,
      /uber\b(?!\s*eats)/i,
      /uklon|уклон/i,
      /taxi|таксі/i,
      /нова\s*пошта|nova\s*poshta|novaposhta/i,
      /укрпошта|ukrposhta/i,
      /meest/i,
      /justin\b/i,
      /міська\s*маршрутка|marshrutka/i,
      /укрзалізниця|uz\.gov|ukrzaliznytsia/i,
      /автобус|bus\b/i,
      /київський\s*метрополітен|kyiv\s*metro/i,
      /карта\s*киянина/i,
      /e-ticket|єтікет/i,
      /parking|паркування|паркомат/i,
      /азс|wog|okko|socar|авіас|авіас/i,
      /shell\b/i,
      /ukravto/i,
      /renault|toyota|volkswagen|hyundai|kia\b|skoda|bmw|mercedes/i,
      /автосервіс|car\s*service|шиномонтаж/i,
      /flixbus/i,
      /wizz\s*air|ryanair|mau\b|міжнародні\s*авіалінії/i,
    ],
  },
  {
    category: 'Медицина',
    patterns: [
      /аптека|apteka|pharmacy/i,
      /бажаємо\s*здоров/i,
      /ліки|мedic/i,
      /denta|стоматолог|dental/i,
      /клініка|clinic|лікарня|hospital/i,
      /лабораторія|synevo|dila\b/i,
      /мед(огляд|центр|послуги)/i,
      /optika|оптика/i,
      /доктор|doctor|лікар/i,
      /аналіз|analiz/i,
    ],
  },
  {
    category: 'Спорт',
    patterns: [
      /спортзал|gym\b|fitness|фітнес/i,
      /world\s*class/i,
      /спорт\s*(мастер|майстер|маркет|depot|store)/i,
      /decathlon/i,
      /intersport/i,
      /басейн|pool\b/i,
      /йога|yoga/i,
      /crossfit/i,
    ],
  },
  {
    category: 'Одяг',
    patterns: [
      /zara\b/i,
      /h&m|hm\b/i,
      /mango\b/i,
      /reserved\b/i,
      /cropp/i,
      /mohito/i,
      /pull&bear|pull and bear/i,
      /bershka/i,
      /lcwaikiki/i,
      /adidas/i,
      /nike\b/i,
      /puma\b/i,
      /new\s*balance/i,
      /reebok/i,
      /одяг|clothes|clothing|fashion/i,
      /взуття|shoes|footwear/i,
    ],
  },
  {
    category: 'Розваги',
    patterns: [
      /steam(?!\s*subscription)/i,
      /playstation|sony\s*interactive/i,
      /xbox/i,
      /nintendo/i,
      /epicgames|epic\s*games/i,
      /кінотеатр|cinema|multiplex|планета\s*кіно/i,
      /боулінг|bowling/i,
      /картинг/i,
      /квест\b|escape\s*room/i,
      /концерт|concert|театр|theatre/i,
      /музей|museum/i,
      /зоопарк/i,
      /amusement|атракціон/i,
    ],
  },
  {
    category: 'Навчання',
    patterns: [
      /udemy/i,
      /coursera/i,
      /prometheus/i,
      /hillel/i,
      /robot\s*dreams/i,
      /lms\b/i,
      /навчання|курси|курс\b/i,
      /освіта|education/i,
      /книгарня|книжков|book(store|shop)/i,
      /yakaboo/i,
      /rozetka.*книг/i,
    ],
  },
  {
    category: 'Комунальні',
    patterns: [
      /комунальні|communal|жкг|жек/i,
      /київенерго|kyivenergo/i,
      /киівводоканал|vodokanal/i,
      /газ\s*(збут|постачання)|naftogaz|нафтогаз/i,
      /інтернет|internet|isp\b/i,
      /київстар|kyivstar|vodafone|lifecell/i,
    ],
  },
  {
    category: 'Житло',
    patterns: [
      /оренда|rent\b/i,
      /іпотека|mortgage/i,
      /leroy\s*merlin/i,
      /епіцентр|epicentr/i,
      /ikea/i,
      /jysk/i,
      /будматеріал|будівельн|hardware\s*store/i,
    ],
  },
  {
    category: 'Краса',
    patterns: [
      /салон\s*(краси|beauty)/i,
      /перукарн|barber|haircut/i,
      /манікюр|педікюр|nails/i,
      /косметик|cosmetic/i,
      /парфум|perfume|fragrance/i,
      /watsons|eva\b|brocard/i,
    ],
  },
  {
    category: 'Побут',
    patterns: [
      /господарч|household/i,
      /прання|пральн|laundry/i,
      /хімчистк|dry\s*clean/i,
      /ремонт\b|repair\b/i,
      /сантехнік|plumb/i,
      /мийн|cleaning\s*supplies/i,
    ],
  },
  {
    category: 'Подорожі',
    patterns: [
      /готель|hotel\b/i,
      /hostel/i,
      /airbnb/i,
      /booking\.com/i,
      /expedia/i,
      /туристичн|tour\b|excursion/i,
    ],
  },
  {
    category: 'Подарунки',
    patterns: [
      /подарунок|gift\b|present\b/i,
      /rozetka\b/i,
      /prom\.ua/i,
      /olx\b/i,
    ],
  },
]

/** Returns the matched category or null. */
function matchCategory(desc: string): string | null {
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(desc)) return rule.category
    }
  }
  return null
}

/**
 * Given a transaction description and a user's category list,
 * returns { name, id } of the best-matching category or null.
 */
export function categorize(desc: string, categories: CategoryEntry[]): CategoryMatch {
  const matched = matchCategory(desc)
  if (!matched) return null
  const cat = categories.find(c => c.name === matched)
  if (!cat) return null
  return { name: cat.name, id: cat._id.toString() }
}
