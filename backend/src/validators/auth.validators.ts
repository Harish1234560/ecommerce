import { z } from 'zod';
import { zEmail, zImageUrl, zOptionalPhone, zPassword, zPhone } from './common.js';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80),
  email: zEmail,
  phone: zOptionalPhone,
  password: zPassword,
});

export const loginSchema = z.object({
  email: zEmail,
  password: z.string().min(1, 'Enter your password').max(72),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80).optional(),
  phone: zPhone.nullable().optional().or(z.literal('').transform(() => null)),
  avatarUrl: zImageUrl.nullable().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: zPassword,
});

export const forgotPasswordSchema = z.object({ email: zEmail });

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(200),
  password: zPassword,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
