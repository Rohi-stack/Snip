/**
 * Google Identity Services token client wrapper.
 * Uses the GIS `google.accounts.oauth2.initTokenClient` popup flow to get
 * an access_token, which is then exchanged with the backend.
 */

declare const google: {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: { access_token?: string; error?: string }) => void;
        error_callback?: (err: { type: string }) => void;
      }): { requestAccessToken(): void };
    };
  };
};

// ─── Replace with your actual Google Client ID ──────────────────────────────
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
// ─────────────────────────────────────────────────────────────────────────────

const BASE = '/api/v1';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

interface GoogleTokenResponse {
  user: AuthUser;
  tokens: StoredTokens;
}

/**
 * Opens a GIS popup and exchanges the resulting access_token with the backend.
 * Returns the backend { user, tokens } payload.
 *
 * Throws an Error if:
 *  - GIS is not yet loaded
 *  - The user cancels the popup
 *  - The backend rejects the token
 */
export function googleSignIn(): Promise<GoogleTokenResponse> {
  return new Promise((resolve, reject) => {
    if (typeof google === 'undefined' || !google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services is not loaded yet. Please try again.'));
      return;
    }

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: async (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error === 'access_denied'
            ? 'Google sign-in was cancelled.'
            : `Google sign-in failed: ${response.error ?? 'unknown error'}`));
          return;
        }

        try {
          const res = await fetch(`${BASE}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: response.access_token }),
          });

          const text = await res.text();
          if (!text || text.trim() === '') {
            reject(new Error('Empty response from server during Google login.'));
            return;
          }

          const json = JSON.parse(text);
          if (!res.ok) {
            reject(new Error(json?.error?.message ?? json?.message ?? `Server error ${res.status}`));
            return;
          }

          resolve(json.data as GoogleTokenResponse);
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Google login request failed.'));
        }
      },
      error_callback: (err) => {
        if (err.type === 'popup_closed') {
          reject(new Error('Sign-in popup was closed.'));
        } else {
          reject(new Error(`Google sign-in error: ${err.type}`));
        }
      },
    });

    tokenClient.requestAccessToken();
  });
}
