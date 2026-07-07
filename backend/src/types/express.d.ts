declare namespace Express {
  interface Request {
    userId?: string
    userRole?: string
    user?: import('../models/User').IUser
  }
}
