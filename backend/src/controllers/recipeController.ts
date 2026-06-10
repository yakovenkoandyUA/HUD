import { Request, Response } from 'express'
import Recipe from '../models/Recipe'
import { User } from '../models/User'
import { getAcceptedFamilyIds } from './familyController'

export async function getAll(req: Request, res: Response): Promise<void> {
  const scope = (req.query.scope as string) ?? 'mine'
  const myId = req.userId as string

  let filter: Record<string, unknown>
  if (scope === 'mine') {
    filter = { userId: myId }
  } else if (scope === 'family') {
    const familyIds = await getAcceptedFamilyIds(myId)
    filter = { userId: { $in: [myId, ...familyIds] } }
  } else {
    filter = {}
  }

  const items = await Recipe.find(filter).sort({ createdAt: -1 })

  if (scope === 'mine') {
    res.json(items)
    return
  }

  // Attach ownerName + ownerAvatarUrl + isOwn for family/all scopes
  const ownerIds = [...new Set(items.map(r => r.userId))]
  const owners = await User.find({ _id: { $in: ownerIds } }).select('_id username name avatarUrl')
  const ownerMap = new Map<string, { name?: string; username?: string; avatarUrl?: string | null }>(
    owners.map(u => [u._id.toString(), u.toObject()])
  )

  const result = items.map(r => {
    const owner = ownerMap.get(r.userId)
    return {
      ...r.toObject(),
      ownerName:     owner?.name ?? owner?.username ?? null,
      ownerAvatarUrl: owner?.avatarUrl ?? null,
      isOwn:         r.userId === myId,
    }
  })

  res.json(result)
}

export async function create(req: Request, res: Response): Promise<void> {
  const item = await Recipe.create({ ...req.body, userId: req.userId })
  res.status(201).json(item)
}

export async function update(req: Request, res: Response): Promise<void> {
  const item = await Recipe.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  )
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(item)
}

export async function remove(req: Request, res: Response): Promise<void> {
  await Recipe.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  res.status(204).end()
}

/** POST /api/recipes/generate — { ingredients, restrictions? } → recipe JSON */
export async function generateRecipe(req: Request, res: Response): Promise<void> {
  const { ingredients, restrictions } = req.body as { ingredients?: string; restrictions?: string }
  if (!ingredients?.trim()) {
    res.status(400).json({ error: 'ingredients required' })
    return
  }

  const prompt = `Ти кулінарний асистент. Склади один рецепт на основі наявних інгредієнтів.
${restrictions?.trim() ? `Обмеження: ${restrictions.trim()}` : ''}
Інгредієнти: ${ingredients.trim()}

Поверни ТІЛЬКИ валідний JSON без жодного додаткового тексту:
{
  "title": "Назва страви",
  "ingredients": ["200г курки", "2 яйця", ...],
  "steps": "1. Крок перший.\\n2. Крок другий.",
  "cookTime": 30,
  "servings": 2,
  "calories": 350,
  "difficulty": "easy",
  "category": "Основні страви"
}
difficulty — одне з: easy, medium, hard
category — одне з: Сніданки, Супи, Салати, Основні страви, Гарніри, Десерти, Випічка, Напої, Закуски, Інше`

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!aiRes.ok) {
      res.status(500).json({ error: 'Помилка генерації рецепту' })
      return
    }

    const aiData = await aiRes.json() as { content: Array<{ type: string; text: string }> }
    const raw = aiData.content[0]?.type === 'text' ? aiData.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      res.status(422).json({ error: 'Не вдалося згенерувати рецепт' })
      return
    }

    const recipe = JSON.parse(jsonMatch[0]) as {
      title: string
      ingredients: string[]
      steps: string
      cookTime: number
      servings: number
      calories: number
      difficulty: string
      category: string
    }

    res.json(recipe)
  } catch {
    res.status(500).json({ error: 'Помилка генерації рецепту' })
  }
}
