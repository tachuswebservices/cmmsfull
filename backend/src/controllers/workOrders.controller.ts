import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../services/prisma';
import { MediaType } from '@prisma/client';
import { getUserPushTokens, sendExpoPush } from '../services/push';

function toPriority(p?: string) {
  switch ((p || '').toLowerCase()) {
    case 'high': return 'HIGH';
    case 'low': return 'LOW';
    default: return 'MEDIUM';
  }
}

function toStatus(s?: string) {
  switch ((s || '').toLowerCase()) {
    case 'in-progress': return 'IN_PROGRESS';
    case 'paused': return 'PAUSED';
    case 'completed': return 'COMPLETED';
    default: return 'PENDING';
  }
}

export async function listWorkOrders(req: Request, res: Response) {
  // If request comes from native mobile (?mobile=true), restrict to the logged-in user's assigned work orders.
  // Otherwise (web/admin dashboard), return all work orders.
  const user = (req as any).user as { id?: string; role?: string } | undefined;
  const isMobile = String((req.query as any).mobile || '').toLowerCase() === 'true';

  let where: any = {};
  if (isMobile) {
    if (!user?.id) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' });
    }
    where = { assignedToId: user.id };
  }

  const items = await prisma.workOrder.findMany({ where, orderBy: { createdAt: 'desc' } });
  return res.status(StatusCodes.OK).json({ items, total: items.length });
}

export async function getWorkOrderById(req: Request, res: Response) {
  const { id } = req.params;
  const item = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      issues: {
        include: { mediaFiles: true },
      },
    },
  });
  if (!item) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Work order not found' });
  return res.status(StatusCodes.OK).json(item);
}

export async function createWorkOrder(req: Request, res: Response) {
  const { title, description, priority, status, assignedToId, assignedToName, dueDate, assetId, assetName } = req.body || {};
  if (!title) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'title is required' });
  const data: any = {
    title,
    description: description || null,
    priority: toPriority(priority),
    status: toStatus(status),
    assignedToId: assignedToId || null,
    assignedToName: assignedToName || null,
    dueDate: dueDate ? new Date(dueDate) : null,
    assetId: assetId || null,
    assetName: assetName || null,
  };
  const created = await prisma.workOrder.create({ data });
  // Notify assignee if present
  if (created.assignedToId) {
    try {
      const tokens = await getUserPushTokens(created.assignedToId);
      if (tokens.length) {
        await sendExpoPush({
          to: tokens,
          title: 'Work order assigned',
          body: `${created.title}${created.assetName ? ' • ' + created.assetName : ''}`,
          data: { type: 'work_order_assigned', workOrderId: created.id },
        });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to send assignment notification', e);
    }
  }
  return res.status(StatusCodes.CREATED).json({ id: created.id });
}

export async function updateWorkOrder(req: Request, res: Response) {
  const { id } = req.params;
  const { title, description, priority, status, assignedToId, assignedToName, dueDate, assetId, assetName } = req.body || {};
  const data: any = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (priority !== undefined) data.priority = toPriority(priority);
  if (status !== undefined) data.status = toStatus(status);
  if (assignedToId !== undefined) data.assignedToId = assignedToId || null;
  if (assignedToName !== undefined) data.assignedToName = assignedToName || null;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (assetId !== undefined) data.assetId = assetId || null;
  if (assetName !== undefined) data.assetName = assetName || null;
  const prev = await prisma.workOrder.findUnique({ where: { id } });
  const updated = await prisma.workOrder.update({ where: { id }, data });
  // If assignment changed, notify the new assignee
  if (assignedToId !== undefined && updated.assignedToId && updated.assignedToId !== prev?.assignedToId) {
    try {
      const tokens = await getUserPushTokens(updated.assignedToId);
      if (tokens.length) {
        await sendExpoPush({
          to: tokens,
          title: 'Work order assigned',
          body: `${updated.title}${updated.assetName ? ' • ' + updated.assetName : ''}`,
          data: { type: 'work_order_assigned', workOrderId: updated.id },
        });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to send assignment notification', e);
    }
  }
  return res.status(StatusCodes.OK).json({ id: updated.id });
}

export async function startWorkOrder(req: Request, res: Response) {
  const { id } = req.params;
  const updated = await prisma.workOrder.update({ where: { id }, data: { status: 'IN_PROGRESS', startedAt: new Date() } });
  return res.status(StatusCodes.OK).json({ id: updated.id, status: updated.status, startedAt: updated.startedAt });
}

export async function pauseWorkOrder(req: Request, res: Response) {
  const { id } = req.params;
  const updated = await prisma.workOrder.update({ where: { id }, data: { status: 'PAUSED', pausedAt: new Date() } });
  return res.status(StatusCodes.OK).json({ id: updated.id, status: updated.status, pausedAt: updated.pausedAt });
}

export async function completeWorkOrder(req: Request, res: Response) {
  const { id } = req.params;
  const updated = await prisma.workOrder.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date() } });
  return res.status(StatusCodes.OK).json({ id: updated.id, status: updated.status, completedAt: updated.completedAt });
}

export async function createIssue(req: Request, res: Response) {
  const { id } = req.params; // work order id
  const { description } = req.body || {};
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const photos = files?.photos || [];
  const audio = files?.audio || [];
  const videos = files?.videos || [];

  // Create WorkOrderIssue with related MediaFile records
  try {
    const issue = await prisma.workOrderIssue.create({
      data: {
        workOrderId: id,
        description: description || null,
        mediaFiles: {
          create: [
            ...photos.map((f) => ({ type: MediaType.PHOTO, path: `/uploads/${f.filename}`, mimeType: f.mimetype })),
            ...audio.map((f) => ({ type: MediaType.AUDIO, path: `/uploads/${f.filename}`, mimeType: f.mimetype })),
            ...videos.map((f) => ({ type: MediaType.VIDEO, path: `/uploads/${f.filename}`, mimeType: f.mimetype })),
          ],
        },
      },
      include: { mediaFiles: true },
    });

    return res.status(StatusCodes.CREATED).json(issue);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to create issue or save media files', e);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to save issue/media' });
  }
}

