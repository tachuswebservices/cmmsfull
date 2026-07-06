import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../services/prisma';

function startOfDay(d: Date) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function endOfDay(d: Date) {
  const dt = new Date(d);
  dt.setHours(23, 59, 59, 999);
  return dt;
}

export async function listMissedPreventiveTasks(req: Request, res: Response) {
  try {
    const { assetId, from, to, status, assignedToId } = req.query as {
      assetId?: string;
      from?: string;
      to?: string;
      status?: string;
      assignedToId?: string;
    };

    const where: any = {};
    if (assetId) where.assetId = assetId;
    if (assignedToId) where.assignedToId = assignedToId;
    if (status) where.status = status;
    if (from || to) {
      where.scheduledDate = {};
      if (from) where.scheduledDate.gte = startOfDay(new Date(from));
      if (to) where.scheduledDate.lte = endOfDay(new Date(to));
    }

    const items = await prisma.missedPreventiveTask.findMany({
      where,
      orderBy: { scheduledDate: 'desc' },
      include: {
        asset: { select: { id: true, name: true, location: true } },
        task: { select: { id: true, title: true, frequency: true } },
      },
    });

    return res.status(StatusCodes.OK).json(items);
  } catch (err) {
    console.error('listMissedPreventiveTasks error', err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to load missed preventive tasks' });
  }
}

export async function markMissedAsResolved(req: Request, res: Response) {
  try {
    const { id } = req.params as { id: string };
    const existing = await prisma.missedPreventiveTask.findUnique({ where: { id } });
    if (!existing) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Missed record not found' });

    const updated = await prisma.missedPreventiveTask.update({
      where: { id },
      data: { status: 'COMPLETED_LATE', resolvedAt: new Date() },
    });

    return res.status(StatusCodes.OK).json(updated);
  } catch (err) {
    console.error('markMissedAsResolved error', err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to update missed record' });
  }
}
