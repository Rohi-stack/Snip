/**
 * Official Sign in with Apple JS popup handler.
 * Dynamically loads Apple's SDK, fetches Client configurations from the server,
 * opens the secure native popup, and performs token exchange.
 */

declare const AppleID: {
  auth: {
    init(config: {
      clientId: string;
      scope: string;
      redirectURI: string;
      state: string;
      nonce?: string;
      usePopup: boolean;
    }): void;
    signIn(): Promise<{
      authorization: {
        code: string;
        id_token: string;
        state: string;
      };
      user?: {
        name?: {
          firstName?: string;
          lastName?: string;
        };
        email?: string;
      };
    }>;
  };
};

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

interface AppleTokenResponse {
  user: AuthUser;
  tokens: StoredTokens;
}

/**
 * Dynamically injects Apple's CDN JS library into the head block.
 */
function loadAppleSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof AppleID !== 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Sign in with Apple SDK from Apple CDN.'));
    document.head.appendChild(script);
  });
}

/**
 * Initiates the Apple Sign-In popup flow and exchanges the JWT token with the backend.
 * Falls back to dev mocking if no credentials are configured on the backend.
 */
export async function appleSignIn(): Promise<AppleTokenResponse> {
  await loadAppleSdk();

  // 1. Fetch dynamic client parameters from server
  let appleClientId = '';
  let appleRedirectUri = '';

  try {
    const configRes = await fetch(`${BASE}/auth/config`);
    if (configRes.ok) {
      const configJson = await configRes.json();
      appleClientId = configJson?.data?.appleClientId || '';
      appleRedirectUri = configJson?.data?.appleRedirectUri || '';
    }
  } catch (e) {
    console.warn('Failed to retrieve dynamic Apple config from backend, falling back to local simulation.', e);
  }

  // 2. Dev Mock Fallback: if server has no Apple configuration, bypass and mock
  if (!appleClientId || !appleRedirectUri) {
    console.warn('[Apple Auth] Backend credentials not set. Bootstrapping simulated local developer flow.');
    return triggerMockSignIn();
  }

  // 3. Initialize AppleID
  const state = Math.random().toString(36).substring(2, 15);
  const nonce = Math.random().toString(36).substring(2, 15);

  AppleID.auth.init({
    clientId: appleClientId,
    scope: 'name email',
    redirectURI: appleRedirectUri,
    state,
    nonce,
    usePopup: true,
  });

  try {
    // 4. Open Apple authentication popup
    const authResult = await AppleID.auth.signIn();
    const idToken = authResult.authorization.id_token;
    
    // Resolve user name if shared (Apple only provides user name on the *very first* sign-in)
    let displayName: string | undefined;
    if (authResult.user?.name) {
      const { firstName, lastName } = authResult.user.name;
      displayName = [firstName, lastName].filter(Boolean).join(' ');
    }

    // 5. Exchange credentials with our Express backend
    const res = await fetch(`${BASE}/auth/apple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, name: displayName }),
    });

    const text = await res.text();
    if (!text || text.trim() === '') {
      throw new Error('Empty response from server during Apple authorization exchange.');
    }

    const json = JSON.parse(text);
    if (!res.ok) {
      throw new Error(json?.error?.message ?? json?.message ?? `Server returned authorization status ${res.status}`);
    }

    return json.data as AppleTokenResponse;
  } catch (err: any) {
    // Graceful cancellation message
    if (err?.error === 'popup_closed_by_user' || err?.message?.includes('popup_closed') || err?.error === 'user_cancelled') {
      throw new Error('Sign-in cancelled.');
    }
    throw err instanceof Error ? err : new Error('Sign in with Apple failed.');
  }
}

/**
 * Trigger local developer mocking. Helps bypass Apple SSL/localhost restrictions in development.
 */
async function triggerMockSignIn(): Promise<AppleTokenResponse> {
  const mockEmail = 'apple-developer-test@example.com';
  const mockName = 'Apple Dev Tester';
  
  // Create standard RS256 simulated payload suffix '_mock'
  const mockIdToken = btoa(JSON.stringify({
    iss: 'https://appleid.apple.com',
    sub: 'mock-apple-sub-developer-12345',
    email: mockEmail,
    name: mockName,
  })) + '_mock';

  const res = await fetch(`${BASE}/auth/apple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: mockIdToken, name: mockName }),
  });

  const text = await res.text();
  const json = JSON.parse(text);
  if (!res.ok) {
    throw new Error(json?.error?.message ?? json?.message ?? 'Simulated Apple auth exchange failed.');
  }

  return json.data as AppleTokenResponse;
}
