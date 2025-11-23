import { env } from '../config/env';

// Using unirest which is already referenced in the JS version
// eslint-disable-next-line @typescript-eslint/no-var-requires
const unirest: any = require('unirest');

function buildMessage(code: string, context: 'LOGIN' | 'PASSWORD' | 'PIN') {
  if (context === 'LOGIN') return `Your login code is ${code}. It expires in 5 minutes.`;
  if (context === 'PASSWORD') return `Your password reset code is ${code}. It expires in 5 minutes.`;
  return `Your PIN reset code is ${code}. It expires in 5 minutes.`;
}

export async function sendOtpSms(
  to: string,
  code: string,
  context: 'LOGIN' | 'PASSWORD' | 'PIN' = 'LOGIN'
) {
  const apiKey = env.FAST2SMS_API_KEY;
  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.warn('[fast2sms] FAST2SMS_API_KEY not set. Skipping SMS send.', { to, code, context });
    return { skipped: true } as const;
  }

  // Fast2SMS expects comma-separated numbers string. We'll normalize to digits-only.
  const numbers = (to || '').toString().replace(/\D+/g, '');
  const message = buildMessage(code, context);

  const req = unirest('POST', 'https://www.fast2sms.com/dev/bulkV2');
  req.headers({
    authorization: apiKey,
    'Content-Type': 'application/json',
  });
  // Optional: set a network timeout (ms)
  if (typeof req.timeout === 'function') {
    req.timeout(10000);
  }
  req.form({
    message,
    language: 'english',
    route: 'q',
    numbers,
  });

  try {
    const res = await new Promise<any>((resolve, reject) => {
      req.end((r: any) => {
        if (!r) return reject(new Error('No response from Fast2SMS'));
        if (r.error) return reject(r.error);
        resolve(r);
      });
    });

    // r.body example contains fields like request_id, message, etc.
    const requestId = res?.body?.request_id || undefined;
    // eslint-disable-next-line no-console
    console.info('[fast2sms] SMS sent', { to: numbers, context, requestId });
    return { requestId } as const;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[fast2sms] Failed to send SMS', err);
    throw err;
  }
}
