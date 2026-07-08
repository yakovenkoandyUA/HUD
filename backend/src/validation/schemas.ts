import { z } from 'zod'

// ── Auth ─────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email:    z.string().email('Невалідний email'),
  password: z.string().min(6, 'Пароль мінімум 6 символів'),
  name:     z.string().min(1, "Ім'я обов'язкове").max(64),
  username: z.string().min(2, 'Username мінімум 2 символи').max(32).regex(/^[a-z0-9_]+$/, 'Username: лише a-z, 0-9, _'),
})

export const loginSchema = z.object({
  email:    z.string().email('Невалідний email'),
  password: z.string().min(1, 'Пароль обов\'язковий'),
})

export const googleAuthSchema = z.object({
  credential: z.string().min(1, 'credential required'),
})

export const pinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'PIN має бути 4 цифри'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Поточний пароль обов\'язковий'),
  newPassword:     z.string().min(6, 'Новий пароль мінімум 6 символів'),
})

export const updateMeSchema = z.object({
  name:              z.string().min(1).max(64).optional(),
  avatarUrl:         z.string().url().optional(),
  f1Enabled:         z.boolean().optional(),
  salaryDay:         z.number().int().min(1).max(31).optional(),
  username:          z.string().min(2).max(32).regex(/^[a-z0-9_]+$/).optional(),
  city:              z.string().max(100).optional(),
  morningStart:      z.number().int().min(0).max(23).optional(),
  afternoonStart:    z.number().int().min(0).max(23).optional(),
  eveningStart:      z.number().int().min(0).max(23).optional(),
  reportStyle:       z.string().max(32).optional(),
  mediaEnabledTabs:  z.array(z.string()).optional(),
  unlockedAchievements:          z.array(z.union([z.string(), z.object({ id: z.string() }).passthrough()])).optional(),
  sprintTutorialSeen:            z.boolean().optional(),
  weekdayLongPressTutorialSeen:  z.boolean().optional(),
  swipeDismissTutorialSeen:      z.boolean().optional(),
  sprintTutorialShownCount:      z.number().optional(),
  weekdayLongPressShownCount:    z.number().optional(),
  swipeDismissShownCount:        z.number().optional(),
  onboardingCompleted:           z.boolean().optional(),
}).refine(d => Object.values(d).some(v => v !== undefined), { message: 'At least one field required' })

// ── Sprint ────────────────────────────────────────────────────────────────────

export const updateTaskSchema = z.object({
  title:             z.string().min(1).max(200).optional(),
  spaceId:           z.string().nullable().optional(),
  done:              z.boolean().optional(),
  priority:          z.enum(['urgent', 'normal', 'low']).optional(),
  dueDate:           z.string().nullable().optional(),
  description:       z.string().max(2000).optional(),
  checklist:         z.array(z.object({ id: z.string(), title: z.string(), done: z.boolean() })).optional(),
  labels:            z.array(z.string()).optional(),
  repeat:            z.string().max(100).nullable().optional(),
  timeOfDay:         z.enum(['morning', 'afternoon', 'evening']).nullable().optional(),
  assignedTo:        z.array(z.string()).optional(),
  completionHistory: z.array(z.string()).optional(),
  isPinned:          z.boolean().optional(),
  category:          z.string().nullable().optional(),
  tag:               z.string().optional(),
  order:             z.number().optional(),
  weekStart:         z.string().optional(),
  weekNumber:        z.number().optional(),
  year:              z.number().optional(),
  nextDue:           z.string().nullable().optional(),
  repeatDay:         z.number().optional(),
  repeatStartDate:   z.string().optional(),
  repeatConfig:      z.record(z.string(), z.unknown()).optional(),
  reminder:          z.object({ amount: z.number(), unit: z.string() }).nullable().optional(),
})

export const createTaskSchema = updateTaskSchema.extend({
  title: z.string().min(1, 'Назва обов\'язкова').max(200),
  type:  z.enum(['task', 'routine', 'todo', 'shopping']).optional(),
})

// ── Transactions ──────────────────────────────────────────────────────────────

export const createTransactionSchema = z.object({
  amount:      z.number().positive('Сума має бути більше 0'),
  type:        z.enum(['income', 'expense']),
  desc:        z.string().max(200).optional(),
  date:        z.string().min(1, 'Дата обов\'язкова'),
  category:    z.string().optional(),
  categoryId:  z.string().optional(),
  title:       z.string().max(200).optional(),
  recurringId: z.string().optional(),
})

// ── Notes ─────────────────────────────────────────────────────────────────────

export const createNoteSchema = z.object({
  text:    z.string().min(1, 'Текст нотатки обов\'язковий').max(5000),
  spaceId: z.string().optional().nullable(),
})

export const updateNoteSchema = z.object({
  text: z.string().min(1).max(5000),
})

// ── Mood ─────────────────────────────────────────────────────────────────────

export const moodSchema = z.object({
  score: z.number().int().min(1).max(5),
  note:  z.string().max(500).optional(),
})

// ── Memories ─────────────────────────────────────────────────────────────────

export const createMemorySchema = z.object({
  title: z.string().min(1, 'Назва обов\'язкова').max(200),
  date:  z.string().min(1, 'Дата обов\'язкова'),
  notes: z.string().max(5000).optional(),
  tags:  z.array(z.string().max(50)).max(20).optional(),
  location: z.object({
    lat: z.number(), lng: z.number(), address: z.string().optional(),
  }).optional(),
})

// ── Recipes ──────────────────────────────────────────────────────────────────

export const createRecipeSchema = z.object({
  title:      z.string().min(1, 'Назва обов\'язкова').max(200),
  category:   z.string().min(1).max(100),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  cookTime:   z.number().int().min(0).optional(),
  servings:   z.number().int().min(1).optional(),
  calories:   z.number().int().min(0).optional(),
  ingredients: z.array(
    z.union([
      z.string(),
      z.object({ name: z.string(), amount: z.string(), unit: z.string() }),
    ])
  ).optional(),
  steps:      z.array(z.string()).optional(),
  imageUrl:   z.string().url().optional(),
  wishlist:   z.boolean().optional(),
})

// ── Watchlist ─────────────────────────────────────────────────────────────────

export const createWatchlistSchema = z.object({
  title:      z.string().min(1, 'Назва обов\'язкова').max(200),
  type:       z.enum(['movie', 'series', 'anime']),
  status:     z.enum(['want', 'watching', 'done']).optional(),
  posterUrl:  z.string().url().nullable().optional(),
  tmdbId:     z.number().optional(),
  year:       z.number().int().optional(),
  totalEpisodes: z.number().int().optional(),
  totalSeasons:  z.number().int().optional(),
})
