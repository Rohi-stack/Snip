import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import type { ShortenApiResponse, ApiSuccessEnvelope } from '../../../../models/url.model';

type CardState = 'idle' | 'loading' | 'result';
type QrFormat = 'png' | 'svg' | 'jpeg';

/**
 * Frontend tier model aligns with backend UserTier:
 *   anonymous | registered | premium
 *
 * 'plan_2' kept as an alias for mid-tier registered users until
 * subscription service is wired.
 *
 * TODO: replace mockUserTier with AuthService + SubscriptionService injection.
 */
export type MockTier = 'anonymous' | 'registered' | 'premium';

export interface Entitlement {
  tierLabel: string;
  expiryLabel: string;
  dailyQuota: number;
  usedToday: number;
  hasAliases: boolean;
  /** QR downloads require premium tier — enforced server-side on GET /api/v1/qr/:shortCode */
  hasQr: boolean;
  isUnlimited: boolean;
  canUpgrade: boolean;
  upgradeText: string;
  badgeVariant: 'muted' | 'orange' | 'amber';
}

const ENTITLEMENTS: Record<MockTier, Entitlement> = {
  anonymous: {
    tierLabel: 'Free Plan',
    expiryLabel: 'Links expire in 1 hour',
    dailyQuota: 5,
    usedToday: 2,
    hasAliases: false,
    hasQr: false,
    isUnlimited: false,
    canUpgrade: true,
    upgradeText: 'Sign up for longer expiry',
    badgeVariant: 'muted',
  },
  registered: {
    tierLabel: 'Free Account',
    expiryLabel: 'Links expire in 24 hours',
    dailyQuota: 10,
    usedToday: 4,
    hasAliases: false,
    hasQr: false,
    isUnlimited: false,
    canUpgrade: true,
    upgradeText: 'Upgrade for custom aliases & QR downloads',
    badgeVariant: 'muted',
  },
  premium: {
    tierLabel: 'Premium',
    expiryLabel: 'Links expire in 30 days',
    dailyQuota: 0,
    usedToday: 8,
    hasAliases: true,
    hasQr: true,
    isUnlimited: true,
    canUpgrade: false,
    upgradeText: '',
    badgeVariant: 'amber',
  },
};

@Component({
  selector: 'app-hero',
  imports: [RouterLink, FormsModule],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class HeroComponent {
  /** QR formats supported by GET /api/v1/qr/:shortCode?format=... */
  readonly qrFormats: QrFormat[] = ['png', 'svg', 'jpeg'];

  // ── Card state ──────────────────────────────────────────────────────────

  cardState = signal<CardState>('idle');
  longUrl = signal('');
  alias = signal('');
  showAlias = signal(false);
  copied = signal(false);

  // ── Result data from real API ────────────────────────────────────────────
  /** Full short URL string, e.g. "https://snip.ly/abc123" or just the path returned */
  resultUrl = signal('');
  /** Short code extracted directly from API response — no string-split hacks */
  resultShortCode = signal('');

  // ── Error states ─────────────────────────────────────────────────────────
  /** Inline error shown below the URL input after a failed shorten call */
  shortenError = signal<string | null>(null);
  /** QR download in-flight format, null when idle */
  qrDownloading = signal<QrFormat | null>(null);
  /** QR download error, auto-clears after 4 s */
  qrError = signal<string | null>(null);

  // ── Entitlement (mock) ────────────────────────────────────────────────────
  // TODO: replace with AuthService + SubscriptionService injection
  userTier = signal<MockTier>('anonymous');

  entitlement = computed<Entitlement>(() => ENTITLEMENTS[this.userTier()]);

  quotaPercent = computed(() => {
    const e = this.entitlement();
    if (e.isUnlimited) return 0;
    return Math.min(100, Math.round((e.usedToday / e.dailyQuota) * 100));
  });

  quotaRemaining = computed(() => {
    const e = this.entitlement();
    if (e.isUnlimited) return 0;
    return e.dailyQuota - e.usedToday;
  });

  isQuotaLow = computed(() => this.quotaPercent() >= 80);
  isQuotaExhausted = computed(() => {
    const e = this.entitlement();
    return !e.isUnlimited && e.usedToday >= e.dailyQuota;
  });

  // ── Shorten ───────────────────────────────────────────────────────────────
  /**
   * Calls POST /api/v1/urls with { originalUrl, alias? }.
   * Backend uses optionalAuth — anonymous requests are accepted.
   * On success: populates resultUrl + resultShortCode from API response.
   * On error: surfaces message via shortenError signal.
   */
  async shorten(): Promise<void> {
    const url = this.longUrl().trim();
    if (!url || this.isQuotaExhausted() || this.cardState() === 'loading') return;

    this.cardState.set('loading');
    this.shortenError.set(null);
    this.qrError.set(null);

    try {
      const body: Record<string, string> = { originalUrl: url };
      const aliasVal = this.alias().trim();
      if (this.entitlement().hasAliases && aliasVal) {
        body['alias'] = aliasVal;
      }

      const res = await fetch('/api/v1/urls', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json() as ApiSuccessEnvelope<ShortenApiResponse> | { message?: string };

      if (!res.ok) {
        const errMsg = (json as { message?: string }).message ?? `Error ${res.status}`;
        throw new Error(errMsg);
      }

      const data = (json as ApiSuccessEnvelope<ShortenApiResponse>).data;
      // Backend returns shortCode — compose display URL from it
      this.resultShortCode.set(data.shortCode);
      this.resultUrl.set(`snip.ly/${data.shortCode}`);
      this.cardState.set('result');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not shorten link. Please try again.';
      this.shortenError.set(msg);
      this.cardState.set('idle');
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
  /**
   * Download QR for the current short link.
   * Calls GET /api/v1/qr/:shortCode?format=png|svg|jpeg (proxied to backend).
   * Backend: requires auth + premium entitlement (enforced server-side).
   */
  async downloadQr(format: QrFormat): Promise<void> {
    const code = this.resultShortCode();
    if (!code || this.qrDownloading()) return;

    this.qrDownloading.set(format);
    this.qrError.set(null);

    try {
      const res = await fetch(`/api/v1/qr/${code}?format=${format}`, {
        credentials: 'include',
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
    // Clear prior shorten error when user starts editing
    if (this.shortenError()) this.shortenError.set(null);
  }

  onAliasChange(value: string): void { this.alias.set(value); }
}
