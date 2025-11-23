import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../services/prisma';
import { sendOtpSms } from '../services/fast2sms';
import { sendOtpEmail } from '../services/mailer';

// Helper: find user by contact (email or phone). Phone matching is flexible
async function findUserByContact(contact: string) {
  const isEmail = contact.includes('@');
  if (isEmail) {
    const email = contact.toLowerCase();
    return prisma.user.findUnique({ where: { email } });
  }
  const digits = contact.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  // Try exact match, digits-only match, or endsWith last 10 digits
  return prisma.user.findFirst({
    where: {
      OR: [
        { phone: contact },
        { phone: digits },
        { phone: { endsWith: last10 } }
      ]
    }
  });
}

// Base64 URL-safe helper used by token generation
function base64url(input: Buffer) {
  return input.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

// Set or update PIN for the authenticated user
export async function setPin(req: Request, res: Response) {
  const userCtx = (req as any).user as { id: string } | undefined;
  const { newPin } = req.body || {};

  if (!userCtx) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' });
  if (!newPin) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'newPin is required' });

  try {
    await prisma.user.update({ where: { id: userCtx.id }, data: { pinHash: hashSecret(newPin) } });
    return res.status(StatusCodes.OK).json({ success: true });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Unable to set PIN' });
  }
}

// Check if a user has a PIN configured by contact (email or phone)
// Note: returns hasPin=false if user is not found to minimize user enumeration.
export async function hasPin(req: Request, res: Response) {
  const { contact } = req.query as { contact?: string };
  if (!contact) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'contact is required' });
  const user = await findUserByContact(contact);
  const hasPin = !!(user && user.pinHash);
  return res.status(StatusCodes.OK).json({ hasPin });
}

// Login using PIN instead of OTP
export async function loginPin(req: Request, res: Response) {
  const { contact, pin } = req.body || {};
  if (!contact || !pin) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'contact and pin are required' });
  const user = await findUserByContact(contact);
  // Do not reveal whether user exists or has pin
  if (!user || !user.pinHash || !verifySecret(pin, user.pinHash)) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid credentials' });
  }

  const accessToken = jwt.sign({ email: user.email, role: user.role || 'OPERATOR' }, env.JWT_SECRET, { subject: user.id, expiresIn: '1h' });
  const refreshToken = jwt.sign({ type: 'refresh' }, env.JWT_SECRET, { subject: user.id, expiresIn: '7d' });
  return res.status(StatusCodes.OK).json({ accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 3600 });
}

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

function hashSecret(secret: string) {
  const salt = base64url(crypto.randomBytes(16))
  const iterations = 100_000
  const hash = crypto.pbkdf2Sync(secret, salt, iterations, 32, 'sha256').toString('hex')
  return `pbkdf2$${iterations}$${salt}$${hash}`
}

function verifySecret(plain: string, stored: string): boolean {
  try {
    const parts = stored.split('$')
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
    const iterations = parseInt(parts[1], 10)
    const salt = parts[2]
    const expectedHex = parts[3]
    const computedHex = crypto.pbkdf2Sync(plain, salt, iterations, 32, 'sha256').toString('hex')
    // constant-time comparison
    const a = Buffer.from(computedHex, 'hex')
    const b = Buffer.from(expectedHex, 'hex')
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'email and password are required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    // Avoid leaking which part failed
    const ok = !!(user && user.passwordHash && verifySecret(password, user.passwordHash))

    if (!ok) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid email or password' })
    }

    const userId = user!.id
    const token = jwt.sign({ email: user!.email, role: user!.role || 'OPERATOR' }, env.JWT_SECRET, { subject: userId, expiresIn: '1h' })
    const refreshToken = jwt.sign({ type: 'refresh' }, env.JWT_SECRET, { subject: userId, expiresIn: '7d' })
    return res.status(StatusCodes.OK).json({ accessToken: token, refreshToken, tokenType: 'Bearer', expiresIn: 3600 })
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Unable to process login' })
  }
}

export async function profile(req: Request, res: Response) {
  try {
    const ctx = (req as any).user as { id: string; email?: string; role?: string } | undefined
    if (!ctx?.id) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized' })
    const dbUser = await prisma.user.findUnique({ where: { id: ctx.id } })
    if (!dbUser) return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' })
    const overrides = (dbUser as any)?.permissionOverrides || {}
    const allow: string[] = Array.isArray((overrides as any).allow) ? (overrides as any).allow : []
    const deny: string[] = Array.isArray((overrides as any).deny) ? (overrides as any).deny : []
    return res.status(StatusCodes.OK).json({
      id: dbUser.id,
      email: dbUser.email || ctx.email,
      name: dbUser.name || dbUser.email || 'User',
      role: dbUser.role || ctx.role || 'OPERATOR',
      phone: dbUser.phone || null,
      department: (dbUser as any).department || null,
      designation: (dbUser as any).designation || null,
      avatarUrl: (dbUser as any).avatarUrl || null,
      permissionOverrides: { allow, deny },
    })
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Unable to load profile' })
  }
}

export async function refreshToken(req: Request, res: Response) {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Missing refresh token' });
  try {
    const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as any;
    const userId = decoded.sub as string | undefined;
    if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid refresh token' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'User not found' });

    const token = jwt.sign({ email: user.email, role: user.role || 'OPERATOR' }, env.JWT_SECRET, { subject: userId, expiresIn: '1h' });
    return res.status(StatusCodes.OK).json({ accessToken: token, tokenType: 'Bearer', expiresIn: 3600 });
  } catch (err) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid refresh token' });
  }
}

// Request a password reset token
export async function requestPasswordReset(req: Request, res: Response) {
  const { email } = req.body || {}
  if (!email) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'email is required' })

  const user = await prisma.user.findUnique({ where: { email } })
  // Always return success to avoid user enumeration
  if (!user) return res.status(StatusCodes.OK).json({ success: true })

  const tokenPlain = base64url(crypto.randomBytes(32))
  const tokenHash = sha256Hex(tokenPlain)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.resetToken.create({
    data: { userId: user.id, type: 'PASSWORD', tokenHash, expiresAt }
  })

  // Dev: log reset link to server console instead of sending mail
  const link = `${env.FRONTEND_URL}/login/reset-password?token=${encodeURIComponent(tokenPlain)}`
  // eslint-disable-next-line no-console
  console.log(`[reset-password] email=${email} link=${link}`)

  // Return generic success (no token in response)
  return res.status(StatusCodes.OK).json({ success: true })
}

// Reset password using token
export async function resetPassword(req: Request, res: Response) {
  const { token, newPassword } = req.body || {}
  if (!token || !newPassword) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'token and newPassword are required' })

  const tokenHash = sha256Hex(token)
  const now = new Date()
  const rt = await prisma.resetToken.findFirst({
    where: { tokenHash, type: 'PASSWORD', usedAt: null, expiresAt: { gt: now } },
  })
  if (!rt) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid or expired token' })

  await prisma.user.update({ where: { id: rt.userId }, data: { passwordHash: hashSecret(newPassword) } })
  await prisma.resetToken.update({ where: { id: rt.id }, data: { usedAt: now } })

  return res.status(StatusCodes.OK).json({ success: true })
}

// Request a PIN reset token
export async function requestPinReset(req: Request, res: Response) {
  const { email } = req.body || {}
  if (!email) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'email is required' })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return res.status(StatusCodes.OK).json({ success: true })

  const tokenPlain = base64url(crypto.randomBytes(32))
  const tokenHash = sha256Hex(tokenPlain)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await prisma.resetToken.create({
    data: { userId: user.id, type: 'PIN', tokenHash, expiresAt }
  })

  // Dev: log reset link to server console instead of sending mail
  const link = `${env.FRONTEND_URL}/login/reset-pin?token=${encodeURIComponent(tokenPlain)}`
  // eslint-disable-next-line no-console
  console.log(`[reset-pin] email=${email} link=${link}`)

  return res.status(StatusCodes.OK).json({ success: true })
}

// Reset PIN using token
export async function resetPin(req: Request, res: Response) {
  const { token, newPin } = req.body || {}
  if (!token || !newPin) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'token and newPin are required' })

  const tokenHash = sha256Hex(token)
  const now = new Date()
  const rt = await prisma.resetToken.findFirst({
    where: { tokenHash, type: 'PIN', usedAt: null, expiresAt: { gt: now } },
  })
  if (!rt) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid or expired token' })

  await prisma.user.update({ where: { id: rt.userId }, data: { pinHash: hashSecret(newPin) } })
  await prisma.resetToken.update({ where: { id: rt.id }, data: { usedAt: now } })

  return res.status(StatusCodes.OK).json({ success: true })
}

// Request OTP for login or resets
export async function requestOtp(req: Request, res: Response) {
  const { contact, type } = req.body || {}
  if (!contact) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'contact (email or phone) is required' })
  const t = (type || 'LOGIN').toString().toUpperCase()
  const otpType = ['LOGIN', 'PASSWORD', 'PIN'].includes(t) ? (t as 'LOGIN'|'PASSWORD'|'PIN') : 'LOGIN'
  const isEmail = contact.includes('@')
  const normalizedContact = isEmail ? contact.toLowerCase() : contact

  // Log request intent (safe: does not reveal if user exists)
  // eslint-disable-next-line no-console
  console.log(`[otp] request received type=${otpType.toLowerCase()} target=${normalizedContact} channel=${isEmail ? 'EMAIL' : 'PHONE'}`)

  const user = await findUserByContact(normalizedContact)

  // Always return success to avoid enumeration; only create OTP if user exists
  if (user) {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const codeHash = sha256Hex(code)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await prisma.oneTimeCode.create({
      data: {
        userId: user.id,
        target: normalizedContact,
        channel: isEmail ? 'EMAIL' : 'PHONE',
        type: otpType,
        codeHash,
        expiresAt,
      },
    })

    const label = otpType.toLowerCase()
    // eslint-disable-next-line no-console
    console.log(`[otp] type=${label} target=${normalizedContact} code=${code}`)

    // Send via email or SMS based on channel. In demo mode, suppress and log instead.
    if (isEmail) {
      if (env.TYPE === 'demo') {
        // eslint-disable-next-line no-console
        console.log(`[otp][demo] EMAIL suppressed type=${label} target=${normalizedContact} code=${code}`)
      } else {
        try {
          await sendOtpEmail(normalizedContact, code, label)
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[otp] Failed to send email', err)
        }
      }
    } else {
      if (env.TYPE === 'demo') {
        // eslint-disable-next-line no-console
        console.log(`[otp][demo] SMS suppressed type=${label} target=${normalizedContact} code=${code}`)
      } else {
        try {
          await sendOtpSms(contact, code, otpType)
        } catch (err) {
          // Log but do not reveal details to client
          // eslint-disable-next-line no-console
          console.error('[otp] Failed to send SMS', err)
        }
      }
    }
  }

  // If user was not found, log for diagnostics (still returns success to avoid enumeration)
  if (!user) {
    // eslint-disable-next-line no-console
    console.log(`[otp] no user found for target=${normalizedContact}; OTP not generated`)
  }

  return res.status(StatusCodes.OK).json({ success: true })
}

export async function verifyOtp(req: Request, res: Response) {
  const { contact, type, code } = req.body || {}
  if (!contact || !code) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'contact and code are required' })
  const t = (type || 'LOGIN').toString().toUpperCase()
  const otpType = ['LOGIN', 'PASSWORD', 'PIN'].includes(t) ? (t as 'LOGIN'|'PASSWORD'|'PIN') : 'LOGIN'

  const now = new Date()
  const isEmail = contact.includes('@')
  const normalizedContact = isEmail ? contact.toLowerCase() : contact
  const otc = await prisma.oneTimeCode.findFirst({
    where: {
      target: normalizedContact,
      type: otpType,
      usedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!otc) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid or expired code' })

  const ok = sha256Hex(code) === otc.codeHash
  if (!ok) {
    await prisma.oneTimeCode.update({ where: { id: otc.id }, data: { attempts: { increment: 1 } } })
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid code' })
  }

  await prisma.oneTimeCode.update({ where: { id: otc.id }, data: { usedAt: now } })

  // For LOGIN: issue tokens
  if (otpType === 'LOGIN') {
    const user = await prisma.user.findUnique({ where: { id: otc.userId! } })
    if (!user) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'User not found' })
    const accessToken = jwt.sign({ email: user.email, role: user.role || 'OPERATOR' }, env.JWT_SECRET, { subject: user.id, expiresIn: '1h' })
    const refreshToken = jwt.sign({ type: 'refresh' }, env.JWT_SECRET, { subject: user.id, expiresIn: '7d' })
    return res.status(StatusCodes.OK).json({ accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 3600 })
  }

  // For PASSWORD/PIN flows, we only confirm success here.
  return res.status(StatusCodes.OK).json({ success: true })
}

// Reset password with OTP
export async function resetPasswordOtp(req: Request, res: Response) {
  const { contact, code, newPassword } = req.body || {}
  if (!contact || !code || !newPassword) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'contact, code and newPassword are required' })

  const now = new Date()
  const isEmail = contact.includes('@')
  const normalizedContact = isEmail ? contact.toLowerCase() : contact
  const otc = await prisma.oneTimeCode.findFirst({
    where: { target: normalizedContact, type: 'PASSWORD', usedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
  })
  if (!otc) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid or expired code' })
  if (sha256Hex(code) !== otc.codeHash) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid code' })

  const user = await prisma.user.findUnique({ where: { id: otc.userId! } })
  if (!user) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'User not found' })

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashSecret(newPassword) } })
  await prisma.oneTimeCode.update({ where: { id: otc.id }, data: { usedAt: now } })

  return res.status(StatusCodes.OK).json({ success: true })
}

// Reset PIN with OTP
export async function resetPinOtp(req: Request, res: Response) {
  const { contact, code, newPin } = req.body || {}
  if (!contact || !code || !newPin) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'contact, code and newPin are required' })

  const now = new Date()
  const isEmail = contact.includes('@')
  const normalizedContact = isEmail ? contact.toLowerCase() : contact
  const otc = await prisma.oneTimeCode.findFirst({
    where: { target: normalizedContact, type: 'PIN', usedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
  })
  if (!otc) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid or expired code' })
  if (sha256Hex(code) !== otc.codeHash) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid code' })

  const user = await prisma.user.findUnique({ where: { id: otc.userId! } })
  if (!user) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'User not found' })

  await prisma.user.update({ where: { id: user.id }, data: { pinHash: hashSecret(newPin) } })
  await prisma.oneTimeCode.update({ where: { id: otc.id }, data: { usedAt: now } })

  return res.status(StatusCodes.OK).json({ success: true })
}

