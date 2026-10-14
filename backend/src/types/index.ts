import type { Role } from '@prisma/client';

// The signed-in user attached to a request by the auth middleware.
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}
