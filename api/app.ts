/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { Prisma } from '@prisma/client'
import authRoutes from './routes/auth.js'
import dehumidifierRoutes from './routes/dehumidifiers.js'
import humidityRoutes from './routes/humidity.js'
import defrostTodoRoutes from './routes/defrostTodo.js'
import collectionRoutes from './routes/collections.js'
import inspectionRoutes from './routes/inspection.js'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/dehumidifiers', dehumidifierRoutes)
app.use('/api/humidity', humidityRoutes)
app.use('/api/defrost-todo', defrostTodoRoutes)
app.use('/api/collections', collectionRoutes)
app.use('/api/inspection', inspectionRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (_req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  ) {
    return res.status(404).json({
      success: false,
      error: '记录不存在',
    })
  }

  console.error(error)
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
