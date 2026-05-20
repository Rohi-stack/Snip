import { AuthProvider } from '@prisma/client';

export interface RegisterInput {
  email: string;
  password?: string; // Optional for OAuth
  name?: string;
  authProvider?: AuthProvider; // Defaults to LOCAL
}

export interface LoginInput {
  email: string;
  password?: string;
}

export interface GoogleLoginInput {
  idToken: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  // `iat` and `exp` are automatically added by jsonwebtoken
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
}
