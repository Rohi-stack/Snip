import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import type { ShortenApiResponse, ApiSuccessEnvelope } from '../../../../models/url.model';
import { AuthService } from '../../../../core/services/auth.service';
import { SubscriptionApiService } from '../../../../services/subscription-api.service';
import { SESSION_RECENT_URLS_KEY } from '../recent-urls/recent-urls';

type CardState = 'idle' | 'loading' | 'result';
type QrFormat = 'png' | 'svg' | 'jpeg';

export interface Entitlement {
  tierLabel: string;
  expiryLabel: string;
  dailyQuota: number;
  hasAliases: boolean;
  hasQr: boolean;
  isUnlimited: boolean;
  canUpgrade: boolean;
  upgradeText: string;
  badgeVariant: 'muted' | 'orange' | 'amber';
}

@Component({
  selector: 'app-hero',
  imports: [RouterLink, FormsModule],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class HeroComponent implements OnInit {
  private auth = inject(AuthService);
  private subApi = inject(SubscriptionApiService);

  /** QR formats supported by GET /api/v1/qr/:shortCode?format=... */
  readonly qrFormats: QrFormat[] = ['png', 'svg', 'jpeg'];

  // ── Auth / Subscription state ────────────────────────────────────────────
  isLoggedIn = this.auth.isLoggedIn;
  isPremium = signal(false);

  // ── Card state ──────────────────────────────────────────────────────────
  cardState = signal<CardState>('idle');
  longUrl = signal('');
  alias = signal('');
  showAlias = signal(false);
  copied = signal(false);

  // ── Result data from real API ────────────────────────────────────────────
  resultUrl = signal('');
  resultShortCode = signal('');

  // ── Error states ─────────────────────────────────────────────────────────
  shortenError = signal<string | null>(null);
  qrDownloading = signal<QrFormat | null>(null);
  qrError = signal<string | null>(null);

  // ── Entitlement (computed from real auth/subscription state) ─────────────
  entitlement = computed<Entitlement>(() => {
    if (this.isPremium()) {
      return {
        tierLabel: 'Premium',
        expiryLabel: 'Links expire in 30 days',
        dailyQuota: 0,
        hasAliases: true,
        hasQr: true,
        isUnlimited: true,
        canUpgrade: false,
        upgradeText: '',
        badgeVariant: 'amber',
      };
    }
    if (this.isLoggedIn()) {
      return {
        tierLabel: 'Free Account',
        expiryLabel: 'Links expire in 24 hours',
        dailyQuota: 10,
        hasAliases: false,
        hasQr: false,
        isUnlimited: false,
        canUpgrade: true,
        upgradeText: 'Upgrade for custom aliases & QR downloads',
        badgeVariant: 'muted',
      };
    }
    // Anonymous
    return {
      tierLabel: 'Free Plan',
      expiryLabel: 'Links expire in 1 hour',
      dailyQuota: 5,
      hasAliases: false,
      hasQr: false,
      isUnlimited: false,
      canUpgrade: true,
      upgradeText: 'Sign up for longer expiry',
      badgeVariant: 'muted',
    };
  });

  isQuotaLow = computed(() => false);      // quota enforced server-side — show error after 429
  isQuotaExhausted = computed(() => false); // quota enforced server-side

  /** Bar fill % — always 0 since we rely on server-side enforcement (429 response) for actual exhaustion. */
  quotaPercent = computed(() => 0);
  /** Remaining links label — shows daily quota from entitlement */
  quotaRemaining = computed(() => this.entitlement().dailyQuota);

  async ngOnInit(): Promise<void> {
    if (this.isLoggedIn()) {
      try {
        const sub = await this.subApi.getMySubscription();
        this.isPremium.set(sub.isPremium);
      } catch {
        // Default to free if request fails
        this.isPremium.set(false);
      }
    }
  }

  // ── Shorten ───────────────────────────────────────────────────────────────
  async shorten(): Promise<void> {
    const url = this.longUrl().trim();
    if (!url || this.cardState() === 'loading') return;

    this.cardState.set('loading');
    this.shortenError.set(null);
    this.qrError.set(null);

    try {
      const body: Record<string, string> = { originalUrl: url };
      const aliasVal = this.alias().trim();
      if (this.entitlement().hasAliases && aliasVal) {
        body['alias'] = aliasVal;
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = await this.auth.getValidAccessToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/urls', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(body),
      });

      const json = await res.json() as ApiSuccessEnvelope<ShortenApiResponse> | { message?: string };

      if (!res.ok) {
        const errMsg = (json as { message?: string }).message ?? `Error ${res.status}`;
        throw new Error(errMsg);
      }

      const data = (json as ApiSuccessEnvelope<ShortenApiResponse>).data;
      this.resultShortCode.set(data.shortCode);
      this.resultUrl.set(`snip.ly/${data.shortCode}`);
      this.cardState.set('result');

      // Push to session storage for the recent-urls component (anonymous & logged-in)
      this.pushToSessionRecent({
        id: data.id ?? data.shortCode,
        shortCode: data.shortCode,
        originalUrl: url,
        createdAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not shorten link. Please try again.';
      this.shortenError.set(msg);
      this.cardState.set('idle');
    }
  }

  private pushToSessionRecent(entry: { id: string; shortCode: string; originalUrl: string; createdAt: string }): void {
    try {
      const raw = sessionStorage.getItem(SESSION_RECENT_URLS_KEY);
      const existing = raw ? (JSON.parse(raw) as typeof entry[]) : [];
      // Prepend new, keep max 10
      const updated = [entry, ...existing.filter(e => e.id !== entry.id)].slice(0, 10);
      sessionStorage.setItem(SESSION_RECENT_URLS_KEY, JSON.stringify(updated));
    } catch {
      // sessionStorage unavailable — no-op
    }
  }

  // ── Copy ──────────────────────────────────────────────────────────────────
  copy(): void {
    navigator.clipboard.writeText(this.resultUrl()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2200);
    });
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  reset(): void {
    this.cardState.set('idle');
    this.longUrl.set('');
    this.alias.set('');
    this.showAlias.set(false);
    this.copied.set(false);
    this.resultUrl.set('');
    this.resultShortCode.set('');
    this.shortenError.set(null);
    this.qrError.set(null);
    this.qrDownloading.set(null);
  }

  // ── Alias toggle ──────────────────────────────────────────────────────────
  toggleAlias(): void {
    if (!this.entitlement().hasAliases) return;
    this.showAlias.update(v => !v);
  }

  // ── QR download ───────────────────────────────────────────────────────────
  async downloadQr(format: QrFormat): Promise<void> {
    const code = this.resultShortCode();
    if (!code || this.qrDownloading()) return;

    this.qrDownloading.set(format);
    this.qrError.set(null);

    try {
      const token = await this.auth.getValidAccessToken();
      const res = await fetch(`/api/v1/qr/${code}?format=${format}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `snip-${code}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'QR download failed';
      this.qrError.set(msg);
      setTimeout(() => this.qrError.set(null), 4000);
    } finally {
      this.qrDownloading.set(null);
    }
  }

  // ── Input handlers ────────────────────────────────────────────────────────
  onLongUrlChange(value: string): void {
    this.longUrl.set(value);
    if (this.shortenError()) this.shortenError.set(null);
  }

  onAliasChange(value: string): void { this.alias.set(value); }
}
