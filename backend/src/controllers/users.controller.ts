import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../services/prisma';
import { Prisma } from '@prisma/client';

export async function listUsers(_req: Request, res: Response) {
  const items = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  return res.status(StatusCodes.OK).json({ items, total: items.length });
}

export async function getUserById(req: Request, res: Response) {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' });
  return res.status(StatusCodes.OK).json(user);
}

export async function createUser(req: Request, res: Response) {
  const { email, passwordHash, pinHash, name, role, phone, designation, department, status, avatarUrl, joinedDate } = req.body || {};

  // Allow either email or phone to identify a user
  if (!email && !phone) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Either email or phone is required' });
  }

  // Password may be absent for phone-only OTP-based users
  // PIN may be absent initially as well
  try {
    const created = await prisma.user.create({
      data: {
        email: email || null,
        passwordHash: passwordHash || null,
        pinHash: pinHash || null,
        name: name || null,
        role: role || null,
        phone: phone || null,
        designation: designation || null,
        department: department || null,
        status: status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        avatarUrl: avatarUrl || null,
        joinedDate: joinedDate ? new Date(joinedDate) : null,
      },
    });
    return res.status(StatusCodes.CREATED).json({ id: created.id });
  } catch (err: any) {
    // Map unique constraint to 409 Conflict
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta as any)?.target as string[] | undefined;
      const field = Array.isArray(target) ? target.join(',') : 'unique field';
      return res.status(StatusCodes.CONFLICT).json({ message: `${field} already exists` });
    }
    console.error('createUser error:', err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to create user' });
  }
}

export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const { name, role, phone, designation, department, status, avatarUrl, joinedDate, pinHash, passwordHash } = req.body || {};
  const data: any = {};
  if (name !== undefined) data.name = name;
  if (role !== undefined) data.role = role;
  if (phone !== undefined) data.phone = phone;
  if (designation !== undefined) data.designation = designation;
  if (department !== undefined) data.department = department;
  if (status !== undefined) data.status = status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
  if (joinedDate !== undefined) data.joinedDate = joinedDate ? new Date(joinedDate) : null;
  if (pinHash !== undefined) data.pinHash = pinHash || null;
  if (passwordHash !== undefined) data.passwordHash = passwordHash;
  const updated = await prisma.user.update({ where: { id }, data });
  return res.status(StatusCodes.OK).json({ id: updated.id });
}

// GET /users/:id/permissions - returns current overrides
export async function getUserPermissions(req: Request, res: Response) {
  const { id } = req.params;
  // Fetch full user and access overrides from dynamic field to avoid TS mismatch before client is regenerated
  const user = await prisma.user.findUnique({ where: { id } } as any);
  if (!user) return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' });
  const overrides = ((user as any).permissionOverrides as any) || { allow: [], deny: [] };
  // Normalize shape
  const allow: string[] = Array.isArray(overrides?.allow) ? overrides.allow : [];
  const deny: string[] = Array.isArray(overrides?.deny) ? overrides.deny : [];
  return res.status(StatusCodes.OK).json({ allow, deny });
}

// PUT /users/:id/permissions - updates overrides
export async function updateUserPermissions(req: Request, res: Response) {
  const { id } = req.params;
  const { allow, deny } = req.body || {};
  // Basic validation
  if (allow !== undefined && !Array.isArray(allow)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'allow must be an array of permission keys' });
  }
  if (deny !== undefined && !Array.isArray(deny)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'deny must be an array of permission keys' });
  }
  // Ensure arrays of strings
  const allowArr = (allow || []).filter((x: any) => typeof x === 'string');
  const denyArr = (deny || []).filter((x: any) => typeof x === 'string');
  // Cast prisma to any to allow updating new JSON field before types regenerate
  const updated = await (prisma as any).user.update({ where: { id }, data: { permissionOverrides: { allow: allowArr, deny: denyArr } } });
  return res.status(StatusCodes.OK).json({ id: updated.id, allow: allowArr, deny: denyArr });
}

// POST /users/:id/avatar - upload avatar and update user avatarUrl
export async function uploadAvatar(req: Request, res: Response) {
  const { id } = req.params
  const file = (req as any).file as Express.Multer.File | undefined
  if (!file) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'File is required' })
  const url = `/uploads/${file.filename}`
  await prisma.user.update({ where: { id }, data: { avatarUrl: url } })
  return res.status(StatusCodes.OK).json({ url })
}

// DELETE /users/:id - delete a user by id
export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params
  try {
    // Best-effort cleanup could be added here (e.g., reset tokens), but core is deleting the user
    await prisma.user.delete({ where: { id } })
    return res.status(StatusCodes.OK).json({ success: true })
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' })
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to delete user' })
  }
}
