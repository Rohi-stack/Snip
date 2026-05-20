import { Injectable, signal, computed, effect } from '@angular/core';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

const STORAGE_KEY_TOKENS = 'snip_tokens';
const STORAGE_KEY_USER = 'snip_user';
const BASE = '/api/v1';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // ── State ───────────────────────────────────────────────────────────────
  private _user = signal<AuthUser | null>(this._loadUser());
  private _tokens = signal<StoredTokens | null>(this._loadTokens());

  /** Public reactive signals */
  readonly currentUser = this._user.asReadonly();
  readonly isLoggedIn = computed(() => {
    const tokens = this._tokens();
    if (!tokens) return false;
    // Decode expiry from JWT payload (no lib needed — just base64)
    try {
      const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]));
      return Date.now() < payload.exp * 1000;
    } catch {
      return false;
    }
  });

  // Persist to localStorage whenever state changes
  constructor() {
    effect(() => {
      const tokens = this._tokens();
      if (tokens) {
        localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(tokens));
      } else {
        localStorage.removeItem(STORAGE_KEY_TOKENS);
      }
    });
    effect(() => {
      const user = this._user();
      if (user) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    });
  }

  // ── Auth Actions ─────────────────────────────────────────────────────────

  async register(email: string, password: string, name?: string): Promise<void> {
    const res = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message ?? json?.message ?? `Error ${res.status}`);
    // After register, auto-login
    await this.login(email, password);
  }

  async login(email: string, password: string): Promise<void> {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message ?? json?.message ?? `Error ${res.status}`);

    const { user, tokens } = json.data as { user: AuthUser; tokens: StoredTokens };
    this._user.set(user);
    this._tokens.set(tokens);
  }

  async logout(): Promise<void> {
    const tokens = this._tokens();
    if (tokens?.refreshToken) {
      try {
        await fetch(`${BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens.accessToken}`,
          },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
      } catch { /* silent — always clear local state */ }
    }
    this._user.set(null);
    this._tokens.set(null);
  }

  async refreshTokens(): Promise<boolean> {
    const tokens = this._tokens();
    if (!tokens?.refreshToken) return false;

    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      if (!res.ok) {
        this._user.set(null);
        this._tokens.set(null);
        return false;
      }
      const json = await res.json();
      this._tokens.set(json.data as StoredTokens);
      return true;
    } catch {
      this._user.set(null);
      this._tokens.set(null);
      return false;
    }
  }

  /** Returns a valid access token, refreshing if needed. Returns null if fully unauthenticated. */
  async getValidAccessToken(): Promise<string | null> {
    if (this.isLoggedIn()) return this._tokens()!.accessToken;
    const ok = await this.refreshTokens();
    return ok ? this._tokens()!.accessToken : null;
  }

  getAccessToken(): string | null {
    return this._tokens()?.accessToken ?? null;
  }

  // ── Persistence helpers ──────────────────────────────────────────────────
  private _loadTokens(): StoredTokens | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TOKENS);
      return raw ? (JSON.parse(raw) as StoredTokens) : null;
    } catch { return null; }
  }

  private _loadUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USER);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch { return null; }
  }
}
