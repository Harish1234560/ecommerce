import { api } from '@/api/client';
import type { AuthResult, User } from '@/types';

export interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export const authService = {
  // Restores the session from the refresh cookie; null for visitors who are not signed in.
  session: () => api.get<AuthResult | null>('/auth/session'),
  login: (email: string, password: string) => api.post<AuthResult>('/auth/login', { email, password }),
  register: (input: RegisterInput) => api.post<AuthResult>('/auth/register', input),
  logout: () => api.post<void>('/auth/logout'),
  updateProfile: (changes: Partial<Pick<User, 'name' | 'phone' | 'avatarUrl'>>) => api.patch<User>('/auth/profile', changes),
  changePassword: (currentPassword: string, newPassword: string) => api.post<void>('/auth/change-password', { currentPassword, newPassword }),
  forgotPassword: (email: string) => api.post<void>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post<void>('/auth/reset-password', { token, password }),
};
