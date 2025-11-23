import { Request, Response } from 'express'
import { prisma } from '../services/prisma'

export const RbacController = {
  async getPermissions(_req: Request, res: Response) {
    const permissions = await prisma.permission.findMany({ orderBy: { key: 'asc' } })
    return res.json({ permissions })
  },

  async getRoles(_req: Request, res: Response) {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: { mappings: { include: { permission: true } } },
    })
    const result = roles.map((r: any) => ({
      id: r.id,
      name: r.name,
      permissions: r.mappings.map((m: any) => m.permission.key),
    }))
    return res.json({ roles: result })
  },

  async createRole(req: Request, res: Response) {
    const { name } = req.body as { name?: string }
    if (!name) return res.status(400).json({ message: 'name is required' })
    try {
      const role = await prisma.role.create({ data: { name: String(name).toUpperCase() } })
      return res.status(201).json(role)
    } catch (e: any) {
      // Handle duplicate unique constraint error
      if (e?.code === 'P2002') {
        return res.status(409).json({ message: 'Role already exists' })
      }
      return res.status(500).json({ message: 'Failed to create role' })
    }
  },

  async deleteRole(req: Request, res: Response) {
    const { id } = req.params
    await prisma.rolePermission.deleteMany({ where: { roleId: id } })
    await prisma.role.delete({ where: { id } })
    return res.json({ success: true })
  },

  async updateRolePermissions(req: Request, res: Response) {
    const { id } = req.params
    const { permissionKeys } = req.body as { permissionKeys?: string[] }
    if (!Array.isArray(permissionKeys)) return res.status(400).json({ message: 'permissionKeys must be an array' })

    const role = await prisma.role.findUnique({ where: { id } })
    if (!role) return res.status(404).json({ message: 'role not found' })

    // Resolve permission ids
    const perms = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } })
    const permIds = new Set(perms.map((p) => p.id))

    // Current mappings
    const current = await prisma.rolePermission.findMany({ where: { roleId: id } })
    const currentIds = new Set(current.map((m) => m.permissionId))

    const toAdd = [...permIds].filter((pid) => !currentIds.has(pid))
    const toRemove = [...currentIds].filter((pid) => !permIds.has(pid))

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: id, permissionId: { in: toRemove } } }),
      prisma.rolePermission.createMany({ data: toAdd.map((pid) => ({ roleId: id, permissionId: pid })) }),
    ])

    return res.json({ success: true })
  },
}
