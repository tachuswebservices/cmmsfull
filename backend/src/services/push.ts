import { prisma } from './prisma';
import { env } from '../config/env';

// Minimal Expo push sender using global fetch (Node 18+)
// Docs: https://docs.expo.dev/push-notifications/sending-notifications/

export type ExpoMessage = {
  to: string | string[];
  title?: string;
  body?: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  priority?: 'default' | 'high' | 'normal';
};

export async function sendExpoPush(message: ExpoMessage) {
  const payloads = Array.isArray(message.to)
    ? message.to.map((to) => ({ to, title: message.title, body: message.body, data: message.data, sound: message.sound ?? 'default', priority: message.priority ?? 'high' }))
    : [{ to: message.to, title: message.title, body: message.body, data: message.data, sound: message.sound ?? 'default', priority: message.priority ?? 'high' }];

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify(payloads),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Expo push send failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

export async function getUserPushTokens(userId: string): Promise<string[]> {
  const tokens = await prisma.pushToken.findMany({ where: { userId } });
  return tokens.map((t: { token: string }) => t.token);
}
