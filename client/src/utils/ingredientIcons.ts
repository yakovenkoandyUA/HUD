const BASE = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@latest/assets'

function icon(folder: string, file: string): string {
  return `${BASE}/${encodeURIComponent(folder)}/3D/${file}_3d.png`
}

// [keyword (uk lowercase partial), folder, filename]
const ICON_MAP: Array<[string, string, string]> = [
  // ── Vegetables ──
  ['морков',    'Carrot',         'carrot'],
  ['цибул',     'Onion',          'onion'],
  ['часник',    'Garlic',         'garlic'],
  ['помідор',   'Tomato',         'tomato'],
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
  ['буряк',     'Beet',          'beet'],
  ['гарбуз',    'Pumpkin',        'pumpkin'],
  ['кабачок',   'Cucumber',       'cucumber'],

  // ── Fruits ──
  ['яблук',     'Red apple',      'red_apple'],
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

  // ── Dairy ──
  ['молок',     'Milk glass',     'milk_glass'],
  ['вершк',     'Milk glass',     'milk_glass'],
  ['сметан',    'Milk glass',     'milk_glass'],
  ['кефір',     'Milk glass',     'milk_glass'],
  ['йогурт',    'Milk glass',     'milk_glass'],
  ['масл',      'Butter',         'butter'],
  ['сир',       'Cheese wedge',   'cheese_wedge'],

  // ── Grains & Carbs ──
  ['борошн',    'Sheaf of rice',  'sheaf_of_rice'],
  ['рис',       'Cooked rice',    'cooked_rice'],
  ['вівсян',    'Sheaf of rice',  'sheaf_of_rice'],
  ['гречк',     'Cooked rice',    'cooked_rice'],
  ['макарон',   'Spaghetti',      'spaghetti'],
  ['спагет',    'Spaghetti',      'spaghetti'],
  ['паст',      'Spaghetti',      'spaghetti'],
  ['хліб',      'Bread',          'bread'],
  ['батон',     'Baguette bread', 'baguette_bread'],
  ['багет',     'Baguette bread', 'baguette_bread'],
  ['круасан',   'Croissant',      'croissant'],
  ['вафл',      'Waffle',         'waffle'],
  ['млинц',     'Pancakes',       'pancakes'],

  // ── Condiments & Liquids ──
  ['мед',       'Honey pot',      'honey_pot'],
  ['олія',      'Olive oil',      'olive_oil'],
  ['олив',      'Olive',          'olive'],
  ['кетчуп',    'Ketchup',        'ketchup'],
  ['сіл',       'Salt',           'salt'],
  ['соус',      'Bottle',         'bottle'],
  ['оцет',      'Bottle',         'bottle'],
  ['соя',       'Soy sauce',      'soy_sauce'],

  // ── Nuts ──
  ['горіх',     'Chestnut',       'chestnut'],
  ['мигдал',    'Chestnut',       'chestnut'],
  ['арахіс',    'Peanuts',        'peanuts'],
  ['фісташк',   'Peanuts',        'peanuts'],

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

  // ── Herbs & Spices ──
  ['петрушк',   'Herb',           'herb'],
  ['кріп',      'Herb',           'herb'],
  ['базилік',   'Herb',           'herb'],
  ['чебрець',   'Herb',           'herb'],
  ['зелен',     'Herb',           'herb'],
  ['коріандр',  'Herb',           'herb'],
  ['м\'ят',     'Herb',           'herb'],
  ['кориц',     'Herb',           'herb'],

  // ── Drinks ──
  ['чай',       'Teacup without handle', 'teacup_without_handle'],
  ['кава',      'Hot beverage',   'hot_beverage'],
  ['пиво',      'Beer mug',       'beer_mug'],
  ['вино',      'Wine glass',     'wine_glass'],
  ['вин',       'Wine glass',     'wine_glass'],
  ['сік',       'Beverage box',   'beverage_box'],
  ['лимонад',   'Tropical drink', 'tropical_drink'],
  ['вода',      'Water wave',     'water_wave'],
]

export function getIngredientIconUrl(ingredient: string): string | null {
  const lower = ingredient.toLowerCase()
  for (const [keyword, folder, file] of ICON_MAP) {
    if (lower.includes(keyword)) {
      return icon(folder, file)
    }
  }
  return null
}
