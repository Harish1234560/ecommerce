import type { Request, Response } from 'express';
import { isProd } from '../config/env.js';
import { API_PREFIX, REFRESH_COOKIE } from '../constants/index.js';
import { currentUser } from '../middleware/auth.js';
import * as authService from '../services/auth.service.js';
import { unauthorized } from '../utils/errors.js';
import { ok } from '../utils/response.js';
import { changePasswordSchema, forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, updateProfileSchema } from '../validators/auth.validators.js';
import { validate } from '../validators/common.js';

// The refresh cookie is httpOnly, SameSite=Strict and scoped to the auth routes only.
const cookieOptions = { httpOnly: true, secure: isProd, sameSite: 'strict' as const, path: `${API_PREFIX}/auth` };
const refreshTokenOf = (req: Request) => req.cookies?.[REFRESH_COOKIE] as string | undefined;
const contextOf = (req: Request): authService.SessionContext => ({ userAgent: req.headers['user-agent'], ip: req.ip });

function sendSession(res: Response, session: authService.NewSession, status: number, message: string) {
  res.cookie(REFRESH_COOKIE, session.refreshToken, { ...cookieOptions, expires: session.refreshExpiresAt });
  ok(res, { user: session.user, accessToken: session.accessToken }, { status, message });
}

export async function register(req: Request, res: Response) {
  const session = await authService.register(validate(registerSchema, req.body), contextOf(req));
  sendSession(res, session, 201, 'Account created');
}

export async function login(req: Request, res: Response) {
  const session = await authService.login(validate(loginSchema, req.body), contextOf(req));
  sendSession(res, session, 200, 'Signed in');
}

// Page-load session check: answers 200 with null for visitors who are not signed in.
export async function session(req: Request, res: Response) {
  const result = await authService.sessionFromRefreshToken(refreshTokenOf(req));
  if (!result && refreshTokenOf(req)) res.clearCookie(REFRESH_COOKIE, cookieOptions);
  ok(res, result);
}

// Exchanges the refresh cookie for a new access token.
export async function refresh(req: Request, res: Response) {
  const result = await authService.sessionFromRefreshToken(refreshTokenOf(req));
  if (!result) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    throw unauthorized('Your session has expired. Please sign in again.');
  }
  ok(res, result);
}

export async function logout(req: Request, res: Response) {
  await authService.logout(refreshTokenOf(req));
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  ok(res, { loggedOut: true }, { message: 'Signed out' });
}

export async function me(req: Request, res: Response) {
  ok(res, await authService.getProfile(currentUser(req).id));
}

export async function updateProfile(req: Request, res: Response) {
  const user = await authService.updateProfile(currentUser(req).id, validate(updateProfileSchema, req.body));
  ok(res, user, { message: 'Profile updated' });
}

export async function changePassword(req: Request, res: Response) {
  await authService.changePassword(currentUser(req).id, validate(changePasswordSchema, req.body), refreshTokenOf(req));
  ok(res, { changed: true }, { message: 'Password changed' });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = validate(forgotPasswordSchema, req.body);
  await authService.requestPasswordReset(email);
  // Same response whether or not the email exists.
  ok(res, null, { message: 'If an account exists for that email, a password reset link has been sent.' });
}

export async function resetPassword(req: Request, res: Response) {
  await authService.resetPassword(validate(resetPasswordSchema, req.body));
  ok(res, { reset: true }, { message: 'Password updated' });
}
