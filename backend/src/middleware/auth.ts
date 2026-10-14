import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../database/prisma.js';
import type { AuthUser } from '../types/index.js';
import { forbidden, unauthorized } from '../utils/errors.js';

export function signAccessToken(user: { id: string; role: Role }): string {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m`,
    algorithm: 'HS256',
  });
}

async function resolveUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  let userId: string;
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || !payload.sub) return null;
    userId = payload.sub;
  } catch {
    return null;
  }
  // Loaded on every request so a disabled account or changed role takes effect immediately.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  req.user = (await resolveUser(req)) ?? undefined;
  next();
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const user = await resolveUser(req);
  if (!user) throw unauthorized();
  req.user = user;
  next();
}

export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const user = await resolveUser(req);
  if (!user) throw unauthorized();
  if (user.role !== 'ADMIN') throw forbidden('Admin access required');
  req.user = user;
  next();
}

// For handlers behind requireAuth / requireAdmin, where the user is guaranteed to exist.
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
