import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connectDB } from './config/db'
import { initWebPush } from './services/webpush'
import { startF1Scheduler } from './services/f1Scheduler'
import { errorHandler } from './middleware/errorHandler'

import authRoutes from './routes/auth'
import transactionRoutes from './routes/transactions'
import sprintRoutes from './routes/sprint'
import lessonRoutes from './routes/lessons'
import recipeRoutes from './routes/recipes'
import watchlistRoutes from './routes/watchlist'
import goalRoutes from './routes/goals'
import pushRoutes from './routes/push'

const app = express()
const PORT = Number(process.env.PORT) || 8080

// CORS fix v2
app.use(cors())

// app.options('*', cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/sprint', sprintRoutes)
app.use('/api/lessons', lessonRoutes)
app.use('/api/recipes', recipeRoutes)
app.use('/api/watchlist', watchlistRoutes)
app.use('/api/goals', goalRoutes)
app.use('/api/push', pushRoutes)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.use(errorHandler)

async function start() {
  await connectDB()
  initWebPush()
  startF1Scheduler()
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`))
}

start()
