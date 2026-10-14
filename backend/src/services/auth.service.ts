import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { env, isProd } from '../config/env.js';
import { BCRYPT_ROUNDS, RESET_TOKEN_MINUTES } from '../constants/index.js';
import { prisma } from '../database/prisma.js';
import { templates } from '../emails/templates.js';
import { signAccessToken } from '../middleware/auth.js';
import { randomToken, sha256 } from '../utils/crypto.js';
import { ApiError, badRequest, unauthorized } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { ChangePasswordInput, LoginInput, RegisterInput, ResetPasswordInput, UpdateProfileInput } from '../validators/auth.validators.js';
import { sendEmail } from './email.service.js';
import { notify } from './notification.service.js';
import { getSettings } from './settings.service.js';

// Sessions: a short-lived JWT access token (returned in the body, kept in memory by the client)
// plus an opaque refresh token delivered as an httpOnly cookie. Only the token's hash is stored.

export interface SessionContext {
  userAgent?: string;
  ip?: string;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
}

export interface NewSession extends AuthResult {
  refreshToken: string;
  refreshExpiresAt: Date;
}

export type PublicUser = Pick<User, 'id' | 'name' | 'email' | 'phone' | 'role' | 'avatarUrl' | 'createdAt'>;

export function toPublicUser(u: User): PublicUser {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, avatarUrl: u.avatarUrl, createdAt: u.createdAt };
}

// A valid bcrypt hash of a random string: compared against when the email is unknown, so that
// "no such user" and "wrong password" take the same time.
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO5KQy1x1bG7n3Qn3nT5JvZq0CkqT9h7e';

async function startSession(user: User, ctx: SessionContext): Promise<NewSession> {
  const refreshToken = randomToken(48);
  const refreshExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  await prisma.session.create({
    data: { userId: user.id, tokenHash: sha256(refreshToken), userAgent: ctx.userAgent?.slice(0, 255), ip: ctx.ip, expiresAt: refreshExpiresAt },
  });
  return { user: toPublicUser(user), accessToken: signAccessToken(user), refreshToken, refreshExpiresAt };
}

export async function register(input: RegisterInput, ctx: SessionContext): Promise<NewSession> {
  if (await prisma.user.findUnique({ where: { email: input.email } })) {
    throw new ApiError(409, 'An account with this email already exists', { email: 'An account with this email already exists' });
  }
  if (input.phone && (await prisma.user.findUnique({ where: { phone: input.phone } }))) {
    throw new ApiError(409, 'This phone number is already registered', { phone: 'This phone number is already registered' });
  }
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      cart: { create: {} },
      wishlist: { create: {} },
    },
  });
  const { store } = await getSettings();
  void sendEmail(user.email, 'welcome', templates.welcome({ storeName: store.name, name: user.name }));
  void notify({ userId: user.id, type: 'SYSTEM', title: `Welcome to ${store.name}`, message: 'Your account is ready. Happy shopping!', link: '/products' });
  return startSession(user, ctx);
}

export async function login(input: LoginInput, ctx: SessionContext): Promise<NewSession> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  // Same error for unknown email and wrong password so accounts cannot be enumerated.
  if (!user || !valid) throw unauthorized('Incorrect email or password');
  if (!user.isActive) throw new ApiError(403, 'This account has been disabled. Please contact support.');
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return startSession(user, ctx);
}

// Returns the session for a refresh token, or null when it is missing, expired, revoked or the account is disabled.
export async function sessionFromRefreshToken(refreshToken: string | undefined): Promise<AuthResult | null> {
  if (!refreshToken) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: sha256(refreshToken) }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt < new Date() || !session.user.isActive) return null;
  return { user: toPublicUser(session.user), accessToken: signAccessToken(session.user) };
}

export async function logout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  await prisma.session.updateMany({ where: { tokenHash: sha256(refreshToken), revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function getProfile(userId: string): Promise<PublicUser> {
  return toPublicUser(await prisma.user.findUniqueOrThrow({ where: { id: userId } }));
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
  if (input.phone) {
    const taken = await prisma.user.findFirst({ where: { phone: input.phone, id: { not: userId } } });
    if (taken) throw new ApiError(409, 'This phone number is already registered', { phone: 'This phone number is already registered' });
  }
  return toPublicUser(await prisma.user.update({ where: { id: userId }, data: input }));
}

export async function changePassword(userId: string, input: ChangePasswordInput, currentRefreshToken: string | undefined): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    throw badRequest('Your current password is incorrect', { currentPassword: 'Your current password is incorrect' });
  }
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS) } });
  // Sign out every other device.
  await prisma.session.updateMany({
    where: { userId, revokedAt: null, ...(currentRefreshToken ? { tokenHash: { not: sha256(currentRefreshToken) } } : {}) },
    data: { revokedAt: new Date() },
  });
}

// Always succeeds from the caller's point of view, whether or not the email exists.
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return;
  const token = randomToken(32);
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TOKEN_MINUTES * 60_000) },
  });
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;
  const { store } = await getSettings();
  if (!isProd) logger.info(`Password reset link for ${email}: ${resetUrl}`);
  void sendEmail(email, 'passwordReset', templates.passwordReset({ storeName: store.name, name: user.name, resetUrl, minutes: RESET_TOKEN_MINUTES }), { force: true });
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(input.token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest('This reset link is invalid or has expired. Please request a new one.');
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS) } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // A password reset signs the account out everywhere.
    prisma.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
}
