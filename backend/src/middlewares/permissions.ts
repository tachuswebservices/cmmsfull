import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { prisma } from '../services/prisma'

/**
 * Middleware that checks whether the authenticated user has a given permission key.
 * Resolution order (mirrors frontend useCan logic):
 *   1. If the key is in the user's permissionOverrides.deny  → 403
 *   2. If the key is in the user's permissionOverrides.allow → pass
 *   3. If the user's role has the key in the DB              → pass
 *   4. Otherwise                                             → 403
 */
export function requirePermission(permissionKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ctx = (req as any).user as { id: string; role?: string } | undefined
    if (!ctx?.id) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' })

    try {
      const dbUser = await (prisma as any).user.findUnique({ where: { id: ctx.id } })
      if (!dbUser) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'User not found' })

      const overrides = (dbUser.permissionOverrides as any) || {}
      const allow: string[] = Array.isArray(overrides.allow) ? overrides.allow : []
      const deny: string[]  = Array.isArray(overrides.deny)  ? overrides.deny  : []

      if (deny.includes(permissionKey)) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: 'Forbidden: permission explicitly denied' })
      }
      if (allow.includes(permissionKey)) return next()

      // Check the role's permissions from DB
      const roleName = (dbUser.role || ctx.role || '').toUpperCase()
      if (roleName) {
        const roleRecord = await prisma.role.findUnique({
          where: { name: roleName },
          include: { mappings: { include: { permission: true } } },
        })
        if (roleRecord) {
          const has = (roleRecord as any).mappings.some((m: any) => m.permission.key === permissionKey)
          if (has) return next()
        }
      }

      return res.status(StatusCodes.FORBIDDEN).json({ message: 'Forbidden: insufficient permission' })
    } catch {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Permission check failed' })
    }
  }
}
