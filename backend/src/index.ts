import 'dotenv/config'
import * as Sentry from '@sentry/node'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import { connectDB } from './config/db'

Sentry.init({
  dsn: 'https://262d5ea5ffab2f393452c3d823f24226@o4511556414603264.ingest.de.sentry.io/4511556439441488',
  environment: process.env.NODE_ENV ?? 'production',
  tracesSampleRate: 0.2,
})
import { initWebPush } from './services/webpush'
import { startF1Scheduler } from './services/f1Scheduler'
import './jobs/pushJobs'
import './jobs/routineReminders'
import './jobs/recurringReminders'
import './jobs/dayReminder'
import { errorHandler } from './middleware/errorHandler'

import authRoutes from './routes/auth'
import transactionRoutes from './routes/transactions'
import sprintRoutes from './routes/sprint'
import lessonRoutes from './routes/lessons'
import recipeRoutes from './routes/recipes'
import watchlistRoutes from './routes/watchlist'
import gamesRouter from './routes/games'
import goalRoutes from './routes/goals'
import pushRoutes from './routes/push'
import memoryRoutes from './routes/memories'
import f1Routes from './routes/f1'
import categoryRoutes from './routes/categories'
import receiptRoutes from './routes/receipt'
import recurringRoutes from './routes/recurringPayments'
import shoppingRoutes from './routes/shopping'
import labelRoutes from './routes/labels'
import watchlistCommentsRouter from './routes/watchlistComments'
import plansRouter from './routes/plans'
import aiRouter from './routes/ai'
import familyRouter from './routes/family'
import financeRouter from './routes/finance'
import notesRouter from './routes/notes'
import moodRouter from './routes/mood'
import mealPlanRouter from './routes/mealPlan'
import bankRouter from './routes/bank'
import weatherRouter from './routes/weather'

const app = express()
const PORT = Number(process.env.PORT) || 8080

app.use(helmet())

const allowedOrigins = ['https://hud-murex.vercel.app', 'https://mimir-hud.tech', 'https://www.mimir-hud.tech', 'http://localhost:5173']
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true)
    else cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))

const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false })
const authLimiter    = rateLimit({ windowMs: 15 * 60 * 1000, max: 10,  standardHeaders: true, legacyHeaders: false })

app.use('/api/auth', authLimiter)
app.use('/api', generalLimiter)

app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

app.use('/api/auth', authRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/sprint', sprintRoutes)
app.use('/api/lessons', lessonRoutes)
app.use('/api/recipes', recipeRoutes)
app.use('/api/watchlist', watchlistRoutes)
app.use('/api/games', gamesRouter)
app.use('/api/watchlist/:id/comments', watchlistCommentsRouter)
app.use('/api/goals', goalRoutes)
app.use('/api/push', pushRoutes)
app.use('/api/memories', memoryRoutes)
app.use('/api/f1', f1Routes)
app.use('/api/categories', categoryRoutes)
app.use('/api/receipt', receiptRoutes)
app.use('/api/recurring', recurringRoutes)
app.use('/api/shopping', shoppingRoutes)
app.use('/api/labels', labelRoutes)
app.use('/api/plans', plansRouter)
app.use('/api/ai', aiRouter)
app.use('/api/family', familyRouter)
app.use('/api/finance', financeRouter)
app.use('/api/notes', notesRouter)
app.use('/api/mood', moodRouter)
app.use('/api/meal-plan', mealPlanRouter)
app.use('/api/bank', bankRouter)
app.use('/api/weather', weatherRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

Sentry.setupExpressErrorHandler(app)
app.use(errorHandler)

async function start() {
  await connectDB()
  initWebPush()
  startF1Scheduler()
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`))
}

start()
