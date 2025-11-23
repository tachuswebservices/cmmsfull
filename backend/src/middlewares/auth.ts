import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { StatusCodes } from 'http-status-codes';

export interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers['authorization'];
  if (!header) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Missing Authorization header' });
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid Authorization header' });
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    (req as any).user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid or expired token' });
  }
}

