const AREA_MAP: Record<string, string> = {
  Spanish:   'Іспанська',
  Italian:   'Італійська',
  American:  'Американська',
  British:   'Британська',
  French:    'Французька',
  Mexican:   'Мексиканська',
  Japanese:  'Японська',
  Chinese:   'Китайська',
  Indian:    'Індійська',
  Thai:      'Тайська',
  Greek:     'Грецька',
  Turkish:   'Турецька',
  Moroccan:  'Марокканська',
  Ukrainian: 'Українська',
}

const CATEGORY_MAP: Record<string, string> = {
  Seafood:       'Морепродукти',
  Chicken:       'Курятина',
  Beef:          'Яловичина',
  Pork:          'Свинина',
  Pasta:         'Паста',
  Dessert:       'Десерт',
  Vegetarian:    'Вегетаріанське',
  Breakfast:     'Сніданок',
  Side:          'Гарнір',
  Starter:       'Закуска',
  Lamb:          'Баранина',
  Miscellaneous: 'Інше',
}

export const translateArea = (area: string): string =>
  AREA_MAP[area] ?? area

export const translateCategory = (category: string): string =>
  CATEGORY_MAP[category] ?? category
