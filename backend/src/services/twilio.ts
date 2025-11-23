import twilio from 'twilio';
import { env } from '../config/env';

let client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!client) {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      // Twilio is optional; if not configured, we no-op
      return null;
    }
    client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

export async function sendOtpSms(to: string, code: string, context: 'LOGIN' | 'PASSWORD' | 'PIN' = 'LOGIN') {
  const cli = getClient();
  if (!cli) {
    // eslint-disable-next-line no-console
    console.warn('[twilio] Not configured. Skipping SMS send.', { to, code, context });
    return { skipped: true } as const;
  }

  const body = context === 'LOGIN'
    ? `Your login code is ${code}. It expires in 5 minutes.`
    : context === 'PASSWORD'
      ? `Your password reset code is ${code}. It expires in 5 minutes.`
      : `Your PIN reset code is ${code}. It expires in 5 minutes.`;

  const messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID || undefined;
  const from = env.TWILIO_FROM_NUMBER || undefined;

  if (!messagingServiceSid && !from) {
    // eslint-disable-next-line no-console
    console.warn('[twilio] Missing TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER. Skipping SMS send.');
    return { skipped: true } as const;
  }

  try {
    const msg = await cli.messages.create({
      to,
      body,
      ...(messagingServiceSid ? { messagingServiceSid } : {}),
      ...(from ? { from } : {}),
    });
    return { sid: msg.sid } as const;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[twilio] Failed to send SMS', err);
    throw err;
  }
}
