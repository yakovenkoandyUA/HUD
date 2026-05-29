/**
 * seedRecipes.ts
 * ---------------
 * Adds 3 test recipes to preview the RecipeDetail screen.
 * Run: railway run npx ts-node src/scripts/seedRecipes.ts
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { User } from '../models/User'
import Recipe from '../models/Recipe'

const RECIPES = [
  {
    title: 'Паста Карбонара',
    ingredients: [
      '400г спагеті',
      '200г панчетти або бекону',
      '4 яйця',
      '100г пармезану',
      '2 зубчики часнику',
      '30мл оливкової олії',
      'сіль, чорний перець',
    ],
    steps: `1. Відваріть спагеті в підсоленій воді до стану al dente.\n2. Обсмажте панчетту з часником на оливковій олії до золотистого кольору.\n3. Збийте яйця з тертим пармезаном і щедрою порцією чорного перцю.\n4. Злийте воду, залишивши ½ склянки. Додайте пасту до панчетти, зніміть з вогню.\n5. Швидко влийте яєчну суміш, додаючи воду від пасти — соус має бути кремовим, без грудок.\n6. Подавайте одразу з додатковим пармезаном і перцем.`,
    imageUrl: 'https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg',
    cookTime: 25,
    servings: 4,
    calories: 420,
    difficulty: 'medium',
    category: 'Основні страви',
    equipment: ['🍳 Сковорода', '🥣 Миска', '🔪 Ніж', '🧀 Тертка'],
    isPersonal: true,
  },
  {
    title: 'Борщ з пампушками',
    ingredients: [
      '500г яловичини',
      '300г буряка',
      '200г капусти',
      '2 картоплини',
      '1 морква',
      '1 цибулина',
      '3 ст. л. томатної пасти',
      '2 ст. л. оцту',
      'лавровий лист, сіль, перець',
      '100г сметани для подачі',
    ],
    steps: `1. Зваріть бульйон з яловичини (1.5–2 год), зніміть піну.\n2. Буряк натріть, обсмажте з оцтом і томатною пастою 10 хв.\n3. Обсмажте цибулю та моркву до м'якості.\n4. До бульйону додайте картоплю, через 10 хв — капусту.\n5. Додайте зажарку та буряк, варіть ще 15 хв.\n6. Посоліть, поперчіть, додайте лавровий лист. Дайте настоятися 20 хв.\n7. Подавайте зі сметаною та пампушками з часником.`,
    imageUrl: '',
    cookTime: 120,
    servings: 6,
    calories: 180,
    difficulty: 'hard',
    category: 'Супи',
    equipment: ['🍲 Каструля', '🔪 Ніж', '🧅 Терка', '🥄 Ложка дерев\'яна'],
    isPersonal: true,
  },
  {
    title: 'Яблучний пиріг',
    ingredients: [
      '3 яблука',
      '200г борошна',
      '150г цукру',
      '3 яйця',
      '100мл кефіру',
      '80мл олії',
      '1 ч. л. розпушувача',
      '1 ч. л. кориці',
      'цукрова пудра для посипки',
    ],
    steps: `1. Яблука очистіть, наріжте тонкими скибочками, посипте корицею.\n2. Збийте яйця з цукром до пишної маси (3–4 хв).\n3. Додайте кефір та олію, перемішайте.\n4. Всипте борошно з розпушувачем, замісіть тісто.\n5. Вилийте половину тіста у форму, викладіть яблука, залийте рештою тіста.\n6. Випікайте при 180°C 40–45 хв до золотистої скоринки.\n7. Остудіть, посипте цукровою пудрою.`,
    imageUrl: 'https://www.themealdb.com/images/media/meals/adxcbq1619787919.jpg',
    cookTime: 55,
    servings: 8,
    calories: 260,
    difficulty: 'easy',
    category: 'Випічка',
    equipment: ['🫙 Форма для випічки', '🥣 Миска', '🔪 Ніж', '⚖️ Терези'],
    isPersonal: true,
  },
]

async function seed(): Promise<void> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set')

  await mongoose.connect(uri)
  console.log('✅ Connected to MongoDB')

  const kotka = await User.findOne({ username: 'kotka' })
  if (!kotka) throw new Error('User kotka not found — run seedUsers first')

  const userId = String(kotka._id)

  for (const data of RECIPES) {
    const exists = await Recipe.findOne({ title: data.title, userId })
    if (exists) {
      console.log(`⚠️  Already exists: ${data.title}`)
      continue
    }
    await Recipe.create({ ...data, userId })
    console.log(`✅ Created: ${data.title}`)
  }

  await mongoose.disconnect()
  console.log('Done.')
}

seed().catch(e => { console.error(e); process.exit(1) })
