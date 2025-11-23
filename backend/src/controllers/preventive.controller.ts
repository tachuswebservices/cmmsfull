import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../services/prisma';

// Normalize a Date to the start of the day (local) to store date-only semantics
function startOfDay(d: Date) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

// Delete a preventive task
export async function deletePreventiveTask(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  try {
    const existing = await prisma.preventiveTask.findUnique({ where: { id } });
    if (!existing) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Task not found' });
    await prisma.preventiveTask.delete({ where: { id } });
    return res.status(StatusCodes.NO_CONTENT).send();
  } catch (err) {
    console.error('deletePreventiveTask error', err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to delete preventive task' });
  }
}

// List preventive tasks assigned to the current user (no geolocation required)
export async function listMyPreventiveTasks(req: Request, res: Response) {
  try {
    const me = (req as any).user as { id?: string } | undefined;
    if (!me?.id) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' });
    const tasks = await prisma.preventiveTask.findMany({
      where: { assignedToId: me.id },
      orderBy: [{ nextDue: 'asc' }, { createdAt: 'desc' } as any],
    } as any);
    const normalized = tasks.map((t: any) => ({
      ...t,
      nextDue: t.nextDue ? startOfDay(new Date(t.nextDue)) : null,
      lastCompleted: t.lastCompleted ? startOfDay(new Date(t.lastCompleted)) : null,
    }));
    return res.status(StatusCodes.OK).json(normalized);
  } catch (err) {
    console.error('listMyPreventiveTasks error', err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to load preventive tasks' });
  }
}
function computeNextDue(frequency: string, from: Date) {
  const d = new Date(from.getTime());
  switch (frequency) {
    case 'DAILY':
      d.setDate(d.getDate() + 1); break;
    case 'WEEKLY':
      d.setDate(d.getDate() + 7); break;
    case 'MONTHLY':
      d.setMonth(d.getMonth() + 1); break;
    case 'QUARTERLY':
      d.setMonth(d.getMonth() + 3); break;
    case 'YEARLY':
      d.setFullYear(d.getFullYear() + 1); break;
    default:
      return null;
  }
  return startOfDay(d);
}

// Create a new preventive task
export async function createPreventiveTask(req: Request, res: Response) {
  try {
    const { assetId, title, description, assignedToName, assignedToId, frequency, category, nextDue, startDate } = req.body as any;
    if (!assetId || !title || !frequency) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'assetId, title and frequency are required' });
    }
    // Normalize frequency to enum values
    const freq = String(frequency).toUpperCase();
    // Base the schedule from the provided startDate (if any) else use now()
    const baseDate = startDate ? startOfDay(new Date(startDate)) : startOfDay(new Date());
    const computedNextDue = nextDue ? startOfDay(new Date(nextDue)) : computeNextDue(freq, baseDate);
    const created = await prisma.preventiveTask.create({
      data: {
        assetId,
        title,
        description,
        assignedToName,
        assignedToId: assignedToId || null,
        frequency: freq as any,
        category,
        nextDue: computedNextDue || null,
        // Align start day with creation date column as requested
        createdAt: baseDate,
      } as any,
    });
    return res.status(StatusCodes.CREATED).json(created);
  } catch (err) {
    console.error('createPreventiveTask error', err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to create preventive task' });
  }
}

// Update an existing preventive task
export async function updatePreventiveTask(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  try {
    const existing = await prisma.preventiveTask.findUnique({ where: { id } });
    if (!existing) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Task not found' });
    const { title, description, assignedToName, assignedToId, frequency, category, assetId } = req.body as any;
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (assignedToName !== undefined) updates.assignedToName = assignedToName;
    if (assignedToId !== undefined) updates.assignedToId = assignedToId || null;
    if (category !== undefined) updates.category = category;
    if (assetId !== undefined) updates.assetId = assetId;
    if (frequency !== undefined) {
      const freq = String(frequency).toUpperCase();
      updates.frequency = freq as any;
      // Recompute from the original start (creation) date to keep schedule anchored
      const anchor = existing.createdAt ? startOfDay(new Date(existing.createdAt)) : startOfDay(new Date());
      updates.nextDue = computeNextDue(freq, anchor);
    }
    const updated = await prisma.preventiveTask.update({ where: { id }, data: updates });
    return res.status(StatusCodes.OK).json(updated);
  } catch (err) {
    console.error('updatePreventiveTask error', err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to update preventive task' });
  }
}

export async function listPreventiveTasks(req: Request, res: Response) {
  const { assetId, userId, latitude, longitude } = req.query as { assetId?: string; userId?: string; latitude?: string; longitude?: string };
  
  try {
    // Determine if current role should bypass geofence (ADMIN/MANAGER)
    const role = ((req as any).user?.role || '').toString().toUpperCase();
    const bypassGeofence = role === 'ADMIN' || role === 'MANAGER';
    // Only enforce geofence for mobile/native requests explicitly indicating so
    const isMobile = String((req.query as any).mobile || '').toLowerCase() === 'true';
    // Global toggle (env) to enable/disable geofencing requirement
    const geofenceEnabled = String(process.env.PREVENTIVE_GEOFENCE_ENABLED ?? 'true').toLowerCase() === 'true';

    // For mobile checks during login/start: allow fetching by assigned user without assetId
    if (!assetId && isMobile) {
      const requester = (req as any).user as { id?: string } | undefined;
      const assignedId = userId || requester?.id;
      if (!assignedId) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' });
      const tasks = await prisma.preventiveTask.findMany({
        where: { assignedToId: assignedId },
        orderBy: [{ nextDue: 'asc' }, { createdAt: 'desc' } as any],
      } as any);
      const normalized = tasks.map((t: any) => ({
        ...t,
        nextDue: t.nextDue ? startOfDay(new Date(t.nextDue)) : null,
        lastCompleted: t.lastCompleted ? startOfDay(new Date(t.lastCompleted)) : null,
      }));
      return res.status(StatusCodes.OK).json(normalized);
    }

    if (!assetId) {
      // Web requests must specify assetId
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'assetId is required' });
    }

    if (!bypassGeofence && isMobile && geofenceEnabled) {
      // Require user coordinates
      const userLat = latitude != null && latitude !== '' ? Number(latitude) : NaN;
      const userLng = longitude != null && longitude !== '' ? Number(longitude) : NaN;
      if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'latitude and longitude are required' });
      }
      
      // Load asset with coordinates
      const asset = (await prisma.asset.findUnique({ where: { id: assetId } })) as any;
      if (!asset) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Asset not found' });
      if (asset.latitude == null || asset.longitude == null) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Asset coordinates not set' });
      }

      // Haversine distance in meters
      const toRad = (v: number) => (v * Math.PI) / 180;
      const R = 6371000; // meters
      const dLat = toRad(userLat - asset.latitude);
      const dLon = toRad(userLng - asset.longitude);
      const lat1 = toRad(asset.latitude);
      const lat2 = toRad(userLat);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      if (distance > 500) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: 'You are not in asset location', distance: Math.round(distance) });
      }
    }

    const where: any = { assetId };
    if (userId) where.assignedToId = userId;
    const tasks = await prisma.preventiveTask.findMany({
      where,
      orderBy: [{ nextDue: 'asc' }, { createdAt: 'desc' } as any],
    } as any);
    // Normalize date fields to date-only for response consistency
    const normalized = tasks.map((t: any) => ({
      ...t,
      nextDue: t.nextDue ? startOfDay(new Date(t.nextDue)) : null,
      lastCompleted: t.lastCompleted ? startOfDay(new Date(t.lastCompleted)) : null,
    }));
    return res.status(StatusCodes.OK).json(normalized);
  } catch (err) {
    console.log('listPreventiveTasks error', err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to load preventive tasks' });
  }
}

export async function completePreventiveTask(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  try {
    const task = await prisma.preventiveTask.findUnique({ where: { id } });
    if (!task) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Task not found' });
    const now = new Date();
    const next = computeNextDue(task.frequency, now);
    const updated = await prisma.preventiveTask.update({
      where: { id },
      data: { lastCompleted: startOfDay(now), nextDue: next, status: 'COMPLETED' as any },
    });
    return res.status(StatusCodes.OK).json(updated);
  } catch (err) {
    console.error('completePreventiveTask error', err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to complete task' });
  }
}
