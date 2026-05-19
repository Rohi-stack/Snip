import { OAuth2Client } from 'google-auth-library';
import { AppError } from '../types/app-error.js';
import { HTTP } from '../constants/http.js';

// In production, this must be set in the environment.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'mock-client-id';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export interface GooglePayload {
  email: string;
  name: string;
  googleId: string;
  picture?: string;
}

export async function verifyGoogleToken(idToken: string): Promise<GooglePayload> {
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
      name: payload.name || '',
      googleId: payload.sub,
      picture: payload.picture,
    };
  } catch (error) {
    throw new AppError(HTTP.UNAUTHORIZED, 'Invalid Google ID token', 'INVALID_GOOGLE_TOKEN');
  }
}
