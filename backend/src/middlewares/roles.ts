import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

// Simple role guard based on string roles present in JWT (req.user.role)
export function requireOneOfRoles(roles: string[]) {
  const set = new Set(roles.map(r => r.toUpperCase()))
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as { role?: string } | undefined
    const role = user?.role?.toUpperCase()
    if (!role || !set.has(role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: 'Forbidden: insufficient role' })
    }
    next()
  }
}
