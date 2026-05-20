import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { UrlApiService, type UrlListItem } from '../../../services/url-api.service';
import { UiStateService } from '../../../core/services/ui-state.service';

@Component({
  selector: 'app-links',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './links.html',
  styleUrl: './links.scss',
})
export class Links implements OnInit {
  private urlApi = inject(UrlApiService);
  uiState = inject(UiStateService);

  loading = signal(true);
  errorMsg = signal<string | null>(null);
  links = signal<UrlListItem[]>([]);
  copiedId = signal<string | null>(null);
  deletingId = signal<string | null>(null);

  // Derived stats
  totalClicks = computed(() => this.links().reduce((sum, l) => sum + l.clickCount, 0));
  activeLinks = computed(() => this.links().filter((l) => l.status === 'ACTIVE').length);
  isPremium = signal(false); // TODO: wire to SubscriptionApiService

  ngOnInit(): void {
    this.loadLinks();
  }

  async loadLinks(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      const result = await this.urlApi.listMyUrls(1, 50);
      this.links.set(result.urls);
    } catch (err) {
      this.errorMsg.set(err instanceof Error ? err.message : 'Failed to load links.');
    } finally {
      this.loading.set(false);
    }
  }

  async deleteLink(id: string): Promise<void> {
    if (this.deletingId()) return;
    this.deletingId.set(id);
    try {
      await this.urlApi.deleteUrl(id);
      this.links.update((ls) => ls.filter((l) => l.id !== id));
    } catch {
      // silent — user can retry
    } finally {
      this.deletingId.set(null);
    }
  }

  copyUrl(link: UrlListItem): void {
    const shortUrl = `snip.ly/${link.shortCode}`;
    navigator.clipboard.writeText(shortUrl).then(() => {
      this.copiedId.set(link.id);
      setTimeout(() => this.copiedId.set(null), 2000);
    });
  }

  shortUrl(link: UrlListItem): string {
    return `snip.ly/${link.shortCode}`;
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  formatExpiry(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    if (d < now) return 'Expired';
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
    if (diffDays <= 1) return 'Expires today';
    if (diffDays < 7) return `in ${diffDays} days`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  isExpired(link: UrlListItem): boolean {
    return link.status === 'EXPIRED' || new Date(link.expiresAt) < new Date();
  }
}
