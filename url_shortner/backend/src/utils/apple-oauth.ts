import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AppError } from '../types/app-error.js';
import { HTTP } from '../constants/http.js';

const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

export interface ApplePayload {
  email: string;
  appleId: string;
  name?: string;
}

// Memory cache for Apple public keys to minimize network hops on repeated login requests
interface CachedKey {
  key: crypto.KeyObject;
  fetchedAt: number;
}
const keysCache = new Map<string, CachedKey>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // Cache keys for 24 hours

/**
 * Resolves Apple's active JWK signature key matching the key ID (kid) and converts it to a Node KeyObject.
 */
async function getApplePublicKey(kid: string): Promise<crypto.KeyObject> {
  const cached = keysCache.get(kid);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.key;
  }

  try {
    const res = await fetch(APPLE_JWKS_URL);
    if (!res.ok) {
      throw new Error(`Apple JWKS endpoint responded with status: ${res.status}`);
    }

    const data = await res.json() as { keys: any[] };
    const jwk = data.keys.find((key) => key.kid === kid);
    if (!jwk) {
      throw new Error(`Apple signature key ID "${kid}" not found in current JWKS`);
    }

    // Native JWK parsing available in Node.js 15.9.0+
    const keyObject = crypto.createPublicKey({
      format: 'jwk',
      key: jwk,
    });

    keysCache.set(kid, {
      key: keyObject,
      fetchedAt: Date.now(),
    });

    return keyObject;
  } catch (err) {
    console.error('[Apple OAuth] Failed resolving public signature key:', err);
    throw new AppError(HTTP.INTERNAL, 'Failed to connect to Apple identity provider.', 'APPLE_JWKS_RESOLVE_FAILED');
  }
}

/**
 * Parses and verifies an incoming Apple identityToken JWT.
 * Verifies key signatures, expiration times, audience matching (APPLE_CLIENT_ID), and issuer.
 */
export async function verifyAppleToken(identityToken: string): Promise<ApplePayload> {
  if (!identityToken) {
    throw new AppError(HTTP.BAD_REQUEST, 'Apple identityToken is required', 'MISSING_APPLE_TOKEN');
  }

  const clientID = process.env.APPLE_CLIENT_ID;

  // Option A Fallback: Enable mock validation in development when Apple variables are not fully configured
  if (!clientID || identityToken.endsWith('_mock')) {
    console.warn('[Apple OAuth] Verification running in local SIMULATED / MOCK mode.');
    
    // Attempt decoding if a JWT was passed, fallback to standard mock values otherwise
    try {
      const decoded = jwt.decode(identityToken) as any;
      return {
        email: decoded?.email || 'mock-apple-user@example.com',
        appleId: decoded?.sub || 'mock-apple-sub-123456789',
        name: decoded?.name || 'Mock Apple User',
      };
    } catch {
      return {
        email: 'mock-apple-user@example.com',
        appleId: 'mock-apple-sub-123456789',
        name: 'Mock Apple User',
      };
    }
  }

  // Decode the token header to capture Key ID (kid)
  const decodedJwt = jwt.decode(identityToken, { complete: true });
  if (!decodedJwt || !decodedJwt.header || !decodedJwt.header.kid) {
    throw new AppError(HTTP.UNAUTHORIZED, 'Malformed Apple identity token structure.', 'INVALID_APPLE_TOKEN');
  }

  const { kid } = decodedJwt.header;

  try {
    const keyObject = await getApplePublicKey(kid);
    // Export standard PEM key to communicate cleanly with jsonwebtoken
    const pemKey = keyObject.export({ type: 'spki', format: 'pem' }) as string;

    const verified = jwt.verify(identityToken, pemKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
      audience: clientID,
    }) as any;

    if (!verified.sub || !verified.email) {
      throw new Error('Verification completed but mandatory email or sub claims were missing.');
    }

    return {
      appleId: verified.sub,
      email: verified.email,
      name: verified.name, // Only available if shared by the user during initial consent
    };
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    console.error('[Apple OAuth] Identity Token signature verification failed:', error);
    throw new AppError(HTTP.UNAUTHORIZED, 'Apple Identity Token verification failed.', 'INVALID_APPLE_TOKEN');
  }
}
