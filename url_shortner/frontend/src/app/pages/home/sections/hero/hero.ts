import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

type CardState = 'idle' | 'loading' | 'result';
type QrFormat = 'png' | 'svg' | 'jpeg';

// In production: resolved from AuthService + SubscriptionService
export type UserTier = 'anonymous' | 'free' | 'plan_2' | 'plan_5';

export interface Entitlement {
  tierLabel: string;
  expiryLabel: string;
  dailyQuota: number;
  usedToday: number;
  hasAliases: boolean;
  hasQr: boolean;        // Only plan_5 — maps to backend requiresPremium check
  isUnlimited: boolean;
  canUpgrade: boolean;
  upgradeText: string;
  badgeVariant: 'muted' | 'orange' | 'amber';
}

const ENTITLEMENTS: Record<UserTier, Entitlement> = {
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
  free: {
    tierLabel: 'Free Account',
    expiryLabel: 'Links expire in 24 hours',
    dailyQuota: 10,
    usedToday: 4,
    hasAliases: false,
    hasQr: false,
    isUnlimited: false,
    canUpgrade: true,
    upgradeText: 'Upgrade for custom aliases & QR',
    badgeVariant: 'muted',
  },
  plan_2: {
    tierLabel: '₹2 Plan',
    expiryLabel: 'Links expire in 7 days',
    dailyQuota: 100,
    usedToday: 11,
    hasAliases: false,
    hasQr: false,
    isUnlimited: false,
    canUpgrade: true,
    upgradeText: 'Upgrade to ₹5 for aliases & QR',
    badgeVariant: 'orange',
  },
  plan_5: {
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
  // Card form state
  cardState = signal<CardState>('idle');
  longUrl = signal('');
  alias = signal('');
  showAlias = signal(false);
  resultUrl = signal('');
  copied = signal(false);

  // QR download state — tracks which format is in-flight, null when idle
  qrDownloading = signal<QrFormat | null>(null);
  qrError = signal<string | null>(null);

  // Mock: set tier to preview different entitlement states
  // In production this comes from AuthService + SubscriptionService
  userTier = signal<UserTier>('anonymous');

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

  /** Extracted short code from resultUrl e.g. "snip.ly/abc123" → "abc123" */
  resultShortCode = computed(() => this.resultUrl().split('/').pop() ?? '');

  shorten(): void {
    const url = this.longUrl().trim();
    if (!url || this.isQuotaExhausted()) return;

    this.cardState.set('loading');
    this.qrError.set(null);
    setTimeout(() => {
      const useAlias = this.entitlement().hasAliases && this.alias().trim();
      const code = useAlias ? this.alias().trim() : this.randomCode();
      this.resultUrl.set(`snip.ly/${code}`);
      this.cardState.set('result');
    }, 900);
  }

  copy(): void {
    navigator.clipboard.writeText(this.resultUrl()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2200);
    });
  }

  reset(): void {
    this.cardState.set('idle');
    this.longUrl.set('');
    this.alias.set('');
    this.showAlias.set(false);
    this.copied.set(false);
    this.resultUrl.set('');
    this.qrError.set(null);
    this.qrDownloading.set(null);
  }

  toggleAlias(): void {
    if (!this.entitlement().hasAliases) return;
    this.showAlias.update(v => !v);
  }

  /**
   * Download QR for the current short link.
   * Calls GET /api/v1/qr/:shortCode?format=png|svg|jpeg (proxied to backend).
   * Backend: requires auth + plan_5 entitlement (enforced server-side).
   */
  async downloadQr(format: QrFormat): Promise<void> {
    const code = this.resultShortCode();
    if (!code || this.qrDownloading()) return;

    this.qrDownloading.set(format);
    this.qrError.set(null);

    try {
      const res = await fetch(`/api/v1/qr/${code}?format=${format}`, {
        credentials: 'include',  // sends session cookie / JWT cookie
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

  onLongUrlChange(value: string): void { this.longUrl.set(value); }
  onAliasChange(value: string): void { this.alias.set(value); }

  private randomCode(): string {
    return Math.random().toString(36).slice(2, 8);
  }
}
