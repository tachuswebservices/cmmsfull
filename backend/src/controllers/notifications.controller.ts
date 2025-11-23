import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../services/prisma';
import { getUserPushTokens, sendExpoPush } from '../services/push';

export async function listNotifications(req: Request, res: Response) {
  try {
    const me = (req as any).user as { id?: string } | undefined
    if (!me?.id) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' })
    const items = await prisma.notification.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return res.status(StatusCodes.OK).json({ items })
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to load notifications' })
  }
}

export async function markRead(req: Request, res: Response) {
  try {
    const me = (req as any).user as { id?: string } | undefined
    if (!me?.id) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' })
    const { id } = req.params as { id: string }
    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    })
    return res.status(StatusCodes.OK).json({ id: updated.id, readAt: updated.readAt })
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to mark as read' })
  }
}

export async function markAllRead(req: Request, res: Response) {
  try {
    const me = (req as any).user as { id?: string } | undefined
    if (!me?.id) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' })
    const result = await prisma.notification.updateMany({
      where: { userId: me.id, readAt: null },
      data: { readAt: new Date() },
    })
    return res.status(StatusCodes.OK).json({ message: 'All notifications marked as read', count: result.count })
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to mark all as read' })
  }
}

// Register Expo push token for current user
export async function registerPushToken(req: Request, res: Response) {
  const user = (req as any).user as { id: string } | undefined;
  if (!user) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' });
  const { token, platform } = req.body || {};
  if (!token) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'token is required' });
  try {
    // Upsert by token so duplicates are avoided across users/devices
    await prisma.pushToken.upsert({
      where: { token },
      create: { token, platform: platform || null, userId: user.id },
      update: { userId: user.id, platform: platform || null },
    });
    return res.status(StatusCodes.OK).json({ success: true });
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to register token' });
  }
}

// Unregister a push token
export async function unregisterPushToken(req: Request, res: Response) {
  const user = (req as any).user as { id: string } | undefined;
  if (!user) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' });
  const { token } = req.body || {};
  if (!token) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'token is required' });
  try {
    await prisma.pushToken.delete({ where: { token } });
  } catch {}
  return res.status(StatusCodes.OK).json({ success: true });
}

// Send a test push notification to the authenticated user's devices
export async function sendTestPush(req: Request, res: Response) {
  const user = (req as any).user as { id: string } | undefined;
  if (!user) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' });
  try {
    const tokens = await getUserPushTokens(user.id);
    if (!tokens.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'No push tokens registered for this user' });
    }
    await sendExpoPush({
      to: tokens,
      title: 'Test Notification',
      body: 'This is a test push from the CMMS backend',
      data: { type: 'test' },
    });
    return res.status(StatusCodes.OK).json({ success: true, sent: tokens.length });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('sendTestPush failed', e);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to send test push', error: e?.message || String(e) });
  }
}

