const BASE = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@latest/assets'

function icon(folder: string, file: string): string {
  return `${BASE}/${encodeURIComponent(folder)}/3D/${file}_3d.png`
}

// [keyword (uk lowercase partial), folder, filename]
// Folder names must match Unicode emoji names exactly as used in Fluent Emoji repo
const ICON_MAP: Array<[string, string, string]> = [
  // ── Vegetables ──
  ['морков',    'Carrot',         'carrot'],
  ['цибул',     'Onion',          'onion'],
  ['цибуля',    'Onion',          'onion'],
  ['часник',    'Garlic',         'garlic'],
  ['помідор',   'Tomato',         'tomato'],
  ['томат',     'Tomato',         'tomato'],
  ['огірок',    'Cucumber',       'cucumber'],
  ['огірк',     'Cucumber',       'cucumber'],
  ['картопл',   'Potato',         'potato'],
  ['капуст',    'Leafy green',    'leafy_green'],
  ['броколі',   'Broccoli',       'broccoli'],
  ['гриб',      'Mushroom',       'mushroom'],
  ['баклажан',  'Eggplant',       'eggplant'],
  ['кукурудз',  'Ear of corn',    'ear_of_corn'],
  ['авокадо',   'Avocado',        'avocado'],
  ['шпинат',    'Leafy green',    'leafy_green'],
  ['перц',      'Bell pepper',    'bell_pepper'],
  ['перець',    'Bell pepper',    'bell_pepper'],
  ['чилі',      'Hot pepper',     'hot_pepper'],
  ['гострий',   'Hot pepper',     'hot_pepper'],
  ['буряк',     'Beet',           'beet'],
  ['гарбуз',    'Pumpkin',        'pumpkin'],
  ['кабачок',   'Cucumber',       'cucumber'],
  ['горошок',   'Pea pod',        'pea_pod'],
  ['квасол',    'Pea pod',        'pea_pod'],
  ['цвітна',    'Broccoli',       'broccoli'],

  // ── Fruits ──
  ['яблук',     'Red apple',      'red_apple'],
  ['яблочн',    'Red apple',      'red_apple'],
  ['яблучн',    'Red apple',      'red_apple'],
  ['груш',      'Pear',           'pear'],
  ['банан',     'Banana',         'banana'],
  ['лимон',     'Lemon',          'lemon'],
  ['лайм',      'Lime',           'lime'],
  ['апельсин',  'Tangerine',      'tangerine'],
  ['мандарин',  'Tangerine',      'tangerine'],
  ['виноград',  'Grapes',         'grapes'],
  ['полуниц',   'Strawberry',     'strawberry'],
  ['полунич',   'Strawberry',     'strawberry'],
  ['малин',     'Cherries',       'cherries'],
  ['чорниц',    'Blueberries',    'blueberries'],
  ['кавун',     'Watermelon',     'watermelon'],
  ['ананас',    'Pineapple',      'pineapple'],
  ['манго',     'Mango',          'mango'],
  ['персик',    'Peach',          'peach'],
  ['вишн',      'Cherries',       'cherries'],
  ['черешн',    'Cherries',       'cherries'],
  ['кокос',     'Coconut',        'coconut'],
  ['диня',      'Melon',          'melon'],

  // ── Proteins ──
  ['яйц',       'Egg',            'egg'],
  ['курк',      'Poultry leg',    'poultry_leg'],
  ['курятин',   'Poultry leg',    'poultry_leg'],
  ['стегн',     'Poultry leg',    'poultry_leg'],
  ['філе',      'Poultry leg',    'poultry_leg'],
  ['риб',       'Fish',           'fish'],
  ['лосос',     'Fish',           'fish'],
  ['тунец',     'Fish',           'fish'],
  ['тунц',      'Fish',           'fish'],
  ['креветк',   'Shrimp',         'shrimp'],
  ['яловичин',  'Cut of meat',    'cut_of_meat'],
  ['свинин',    'Cut of meat',    'cut_of_meat'],
  ['м\'яс',     'Cut of meat',    'cut_of_meat'],
  ['мяс',       'Cut of meat',    'cut_of_meat'],
  ['бекон',     'Bacon',          'bacon'],
  ['сосис',     'Hot dog',        'hot_dog'],
  ['ковбас',    'Meat on bone',   'meat_on_bone'],
  ['індич',     'Poultry leg',    'poultry_leg'],
  ['кролик',    'Meat on bone',   'meat_on_bone'],

  // ── Dairy ──
  ['молок',     'Glass of milk',  'glass_of_milk'],
  ['вершк',     'Glass of milk',  'glass_of_milk'],
  ['сметан',    'Glass of milk',  'glass_of_milk'],
  ['кефір',     'Glass of milk',  'glass_of_milk'],
  ['йогурт',    'Glass of milk',  'glass_of_milk'],
  ['масл',      'Butter',         'butter'],
  ['сир',       'Cheese wedge',   'cheese_wedge'],
  ['пармезан',  'Cheese wedge',   'cheese_wedge'],
  ['моцарел',   'Cheese wedge',   'cheese_wedge'],
  ['рікота',    'Cheese wedge',   'cheese_wedge'],

  // ── Grains, Carbs & Starch ──
  ['борошн',    'Sheaf of rice',  'sheaf_of_rice'],
  ['крохмал',   'Sheaf of rice',  'sheaf_of_rice'],
  ['рис',       'Cooked rice',    'cooked_rice'],
  ['вівсян',    'Sheaf of rice',  'sheaf_of_rice'],
  ['гречк',     'Cooked rice',    'cooked_rice'],
  ['макарон',   'Spaghetti',      'spaghetti'],
  ['спагет',    'Spaghetti',      'spaghetti'],
  ['паст',      'Spaghetti',      'spaghetti'],
  ['хліб',      'Bread',          'bread'],
  ['тісто',     'Bread',          'bread'],
  ['батон',     'Baguette bread', 'baguette_bread'],
  ['багет',     'Baguette bread', 'baguette_bread'],
  ['круасан',   'Croissant',      'croissant'],
  ['вафл',      'Waffle',         'waffle'],
  ['млинц',     'Pancakes',       'pancakes'],

  // ── Condiments & Liquids ──
  ['мед',       'Honey pot',      'honey_pot'],
  ['олія',      'Olive',          'olive'],
  ['олив',      'Olive',          'olive'],
  ['кетчуп',    'Tomato',         'tomato'],
  ['сіл',       'Salt',           'salt'],
  ['соєвий',    'Jar',            'jar'],
  ['соя',       'Jar',            'jar'],
  ['соус',      'Pot of food',    'pot_of_food'],
  ['оцет',      'Lemon',          'lemon'],
  ['майонез',   'Jar',            'jar'],
  ['гірчиц',    'Jar',            'jar'],
  ['перець мел','Salt',           'salt'],

  // ── Nuts ──
  ['горіх',     'Chestnut',       'chestnut'],
  ['мигдал',    'Chestnut',       'chestnut'],
  ['арахіс',    'Peanuts',        'peanuts'],
  ['фісташк',   'Peanuts',        'peanuts'],
  ['кешью',     'Peanuts',        'peanuts'],

  // ── Sweet ──
  ['шоколад',   'Chocolate bar',  'chocolate_bar'],
  ['торт',      'Shortcake',      'shortcake'],
  ['тістечк',   'Shortcake',      'shortcake'],
  ['пиріг',     'Pie',            'pie'],
  ['пирог',     'Pie',            'pie'],
  ['печиво',    'Cookie',         'cookie'],
  ['морозив',   'Ice cream',      'ice_cream'],
  ['цукор',     'Honey pot',      'honey_pot'],
  ['цукерк',    'Candy',          'candy'],
  ['мармелад',  'Candy',          'candy'],
  ['варення',   'Honey pot',      'honey_pot'],
  ['джем',      'Honey pot',      'honey_pot'],

  // ── Herbs & Spices ──
  ['петрушк',   'Herb',           'herb'],
  ['кріп',      'Herb',           'herb'],
  ['базилік',   'Herb',           'herb'],
  ['чебрець',   'Herb',           'herb'],
  ['зелен',     'Herb',           'herb'],
  ['коріандр',  'Herb',           'herb'],
  ['м\'ят',     'Herb',           'herb'],
  ['кориц',     'Herb',           'herb'],
  ['куркум',    'Herb',           'herb'],
  ['паприк',    'Hot pepper',     'hot_pepper'],
  ['лавров',    'Herb',           'herb'],

  // ── Drinks ──
  ['чай',       'Teacup without handle', 'teacup_without_handle'],
  ['кава',      'Hot beverage',   'hot_beverage'],
  ['пиво',      'Beer mug',       'beer_mug'],
  ['вино',      'Wine glass',     'wine_glass'],
  ['вин',       'Wine glass',     'wine_glass'],
  ['сік',       'Beverage box',   'beverage_box'],
  ['лимонад',   'Tropical drink', 'tropical_drink'],
  ['вода',      'Water wave',     'water_wave'],
  ['бульйон',   'Pot of food',    'pot_of_food'],
]

// Splits compound ingredient names like "олія або масло вершкове" into parts
const COMPOUND_RE = /\s+або\s+|\s+та\s+|\s+чи\s+|\s*\/\s*/

function searchMap(str: string): string | null {
  for (const [keyword, folder, file] of ICON_MAP) {
    if (str.includes(keyword)) return icon(folder, file)
  }
  return null
}

export function getIngredientIconUrl(ingredient: string): string | null {
  const lower = ingredient.toLowerCase()

  // For compound ingredients, try each part in order — first match wins
  if (COMPOUND_RE.test(lower)) {
    for (const part of lower.split(COMPOUND_RE)) {
      const result = searchMap(part.trim())
      if (result) return result
    }
  }

  return searchMap(lower)
}
