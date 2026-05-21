import { Component, computed, inject, OnInit, signal, output, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { SubscriptionApiService } from '../../../services/subscription-api.service';
import { SESSION_RECENT_URLS_KEY } from '../../../pages/home/sections/recent-urls/recent-urls';

// Replace with correct path if needed
import type { ShortenApiResponse, ApiSuccessEnvelope } from '../../../models/url.model';

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
  selector: 'app-create-link-modal',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './create-link-modal.html',
  styleUrl: './create-link-modal.scss',
})
export class CreateLinkModalComponent implements OnInit {
  private auth = inject(AuthService);
  private subApi = inject(SubscriptionApiService);

  closeModal = output<void>();

  readonly qrFormats: QrFormat[] = ['png', 'svg', 'jpeg'];

  isLoggedIn = this.auth.isLoggedIn;
  isPremium = signal(false);

  cardState = signal<CardState>('idle');
  longUrl = signal('');
  alias = signal('');
  showAlias = signal(false);
  copied = signal(false);

  resultUrl = signal('');
  resultShortCode = signal('');

  shortenError = signal<string | null>(null);
  qrDownloading = signal<QrFormat | null>(null);
  qrError = signal<string | null>(null);

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

  isQuotaLow = computed(() => false);
  isQuotaExhausted = computed(() => false);
  quotaPercent = computed(() => 0);
  quotaRemaining = computed(() => this.entitlement().dailyQuota);

  // Focus modal element logic
  isVisible = signal(false);

  @HostListener('window:keydown.Escape')
  onEscape(): void {
    this.close();
  }

  async ngOnInit(): Promise<void> {
    // Trigger entrance animation
    setTimeout(() => this.isVisible.set(true), 10);

    if (this.isLoggedIn()) {
      try {
        const sub = await this.subApi.getMySubscription();
        this.isPremium.set(sub.isPremium);
      } catch {
        this.isPremium.set(false);
      }
    }
  }

  close(): void {
    this.isVisible.set(false);
    setTimeout(() => this.closeModal.emit(), 300); // Wait for animation
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close();
    }
  }

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
      const updated = [entry, ...existing.filter(e => e.id !== entry.id)].slice(0, 10);
      sessionStorage.setItem(SESSION_RECENT_URLS_KEY, JSON.stringify(updated));
    } catch {
      // sessionStorage unavailable — no-op
    }
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
    this.resultShortCode.set('');
    this.shortenError.set(null);
    this.qrError.set(null);
    this.qrDownloading.set(null);
  }

  toggleAlias(): void {
    if (!this.entitlement().hasAliases) return;
    this.showAlias.update(v => !v);
  }

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

  onLongUrlChange(value: string): void {
    this.longUrl.set(value);
    if (this.shortenError()) this.shortenError.set(null);
  }

  onAliasChange(value: string): void { this.alias.set(value); }
}
