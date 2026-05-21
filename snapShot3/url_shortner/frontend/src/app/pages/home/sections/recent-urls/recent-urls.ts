import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { UrlApiService, type UrlListItem } from '../../../../services/url-api.service';

/** Key used by hero component to store anonymously-created links in sessionStorage */
export const SESSION_RECENT_URLS_KEY = 'snip_session_urls';

export interface SessionUrl {
  id: string;
  shortCode: string;
  originalUrl: string;
  createdAt: string;
}

@Component({
  selector: 'app-recent-urls',
  imports: [RouterLink],
  templateUrl: './recent-urls.html',
  styleUrl: './recent-urls.scss',
})
export class RecentUrlsComponent implements OnInit {
  private auth = inject(AuthService);
  private urlApi = inject(UrlApiService);

  isAuthenticated = this.auth.isLoggedIn;
  loading = signal(false);
  copiedId = signal<string | null>(null);

  /** For logged-in users — fetched from API */
  apiLinks = signal<UrlListItem[]>([]);
  /** For anonymous users — from sessionStorage */
  sessionLinks = signal<SessionUrl[]>([]);

  ngOnInit(): void {
    if (this.isAuthenticated()) {
      this.loadApiLinks();
    } else {
      this.loadSessionLinks();
    }
  }

  private async loadApiLinks(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.urlApi.listMyUrls(1, 5);
      this.apiLinks.set(result.urls);
    } catch {
      // Silent — empty state will show
    } finally {
      this.loading.set(false);
    }
  }

  private loadSessionLinks(): void {
    try {
      const raw = sessionStorage.getItem(SESSION_RECENT_URLS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SessionUrl[];
        this.sessionLinks.set(Array.isArray(parsed) ? parsed.slice(0, 5) : []);
      }
    } catch {
      this.sessionLinks.set([]);
    }
  }

  get hasLinks(): boolean {
    return this.isAuthenticated()
      ? this.apiLinks().length > 0
      : this.sessionLinks().length > 0;
  }

  shortUrl(code: string): string {
    return `snip.ly/${code}`;
  }

  copyUrl(code: string, id: string): void {
    navigator.clipboard.writeText(this.shortUrl(code)).then(() => {
      this.copiedId.set(id);
      setTimeout(() => this.copiedId.set(null), 2000);
    });
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  }

  truncate(url: string, max = 50): string {
    try {
      const clean = url.replace(/^https?:\/\/(www\.)?/, '');
      return clean.length > max ? clean.slice(0, max) + '…' : clean;
    } catch {
      return url;
    }
  }
}
