import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connectDB } from './config/db'
import { initWebPush } from './services/webpush'
import { errorHandler } from './middleware/errorHandler'

import authRoutes from './routes/auth'
import transactionRoutes from './routes/transactions'
import sprintRoutes from './routes/sprint'
import lessonRoutes from './routes/lessons'
import recipeRoutes from './routes/recipes'
import watchlistRoutes from './routes/watchlist'
import goalRoutes from './routes/goals'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/sprint', sprintRoutes)
app.use('/api/lessons', lessonRoutes)
app.use('/api/recipes', recipeRoutes)
app.use('/api/watchlist', watchlistRoutes)
app.use('/api/goals', goalRoutes)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.use(errorHandler)

async function start() {
  await connectDB()
  initWebPush()
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
}

start()
