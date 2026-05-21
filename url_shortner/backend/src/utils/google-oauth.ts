import { OAuth2Client } from 'google-auth-library';
import { AppError } from '../types/app-error.js';
import { HTTP } from '../constants/http.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export interface GooglePayload {
  email: string;
  name: string;
  googleId: string;
  picture?: string;
}

/**
 * Verifies a Google ID token (e.g. from Firebase / GIS `credential` callback).
 * Used when the frontend sends `{ idToken }`.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GooglePayload> {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
      throw new Error('Invalid Google payload');
    }
    return {
      email: payload.email,
      name: payload.name ?? '',
      googleId: payload.sub,
      picture: payload.picture,
    };
  } catch {
    throw new AppError(HTTP.UNAUTHORIZED, 'Invalid Google ID token', 'INVALID_GOOGLE_TOKEN');
  }
}

/**
 * Fetches user info from Google using an OAuth2 access token.
 * Used when the frontend sends `{ accessToken }` from the GIS token client.
 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GooglePayload> {
  const resp = await fetch(
    `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${encodeURIComponent(accessToken)}`
  );
  if (!resp.ok) {
    throw new AppError(HTTP.UNAUTHORIZED, 'Failed to fetch Google user info', 'GOOGLE_USERINFO_FAILED');
  }
  const data = await resp.json() as {
    sub: string; email: string; name?: string; picture?: string; email_verified?: boolean;
  };
  if (!data.sub || !data.email) {
    throw new AppError(HTTP.UNAUTHORIZED, 'Incomplete Google user info', 'INVALID_GOOGLE_TOKEN');
  }
  return {
    googleId: data.sub,
    email: data.email,
    name: data.name ?? '',
    picture: data.picture,
  };
}

/** Accepts either idToken or accessToken — tries idToken first */
export async function verifyGoogleToken(input: { idToken?: string; accessToken?: string }): Promise<GooglePayload> {
  if (input.idToken) return verifyGoogleIdToken(input.idToken);
  if (input.accessToken) return fetchGoogleUserInfo(input.accessToken);
  throw new AppError(HTTP.BAD_REQUEST, 'Provide idToken or accessToken', 'MISSING_GOOGLE_TOKEN');
}
