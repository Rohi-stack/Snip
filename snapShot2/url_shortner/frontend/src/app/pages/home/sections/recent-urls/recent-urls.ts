import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ShortUrl } from '../../../../models/url.model';

@Component({
  selector: 'app-recent-urls',
  imports: [RouterLink],
  templateUrl: './recent-urls.html',
  styleUrl: './recent-urls.scss',
})
export class RecentUrlsComponent {
  // Toggle to preview authenticated state
  isAuthenticated = signal(false);

  copiedId = signal<string | null>(null);

  anonUrls: ShortUrl[] = [
    {
      id: '1',
      shortCode: 'abc123',
      shortUrl: 'snip.ly/abc123',
      originalUrl: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch',
      clicks: 14,
      createdAt: '2 minutes ago',
      hasQr: false,
    },
    {
      id: '2',
      shortCode: 'xk8pq2',
      shortUrl: 'snip.ly/xk8pq2',
      originalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      clicks: 7,
      createdAt: '15 minutes ago',
      hasQr: true,
    },
    {
      id: '3',
      shortCode: 'zt4r91',
      shortUrl: 'snip.ly/zt4r91',
      originalUrl: 'https://github.com/angular/angular/releases/tag/v21.0.0',
      clicks: 32,
      createdAt: '1 hour ago',
      hasQr: false,
    },
  ];

  authUrls: ShortUrl[] = [
    {
      id: '1',
      shortCode: 'launch24',
      shortUrl: 'snip.ly/launch24',
      originalUrl: 'https://producthunt.com/posts/snip-saas-url-shortener',
      alias: 'launch24',
      clicks: 1284,
      createdAt: '2 days ago',
      hasQr: true,
    },
    {
      id: '2',
      shortCode: 'docs-v2',
      shortUrl: 'snip.ly/docs-v2',
      originalUrl: 'https://docs.snip.ly/api/v2/getting-started',
      alias: 'docs-v2',
      clicks: 542,
      createdAt: '4 days ago',
      hasQr: false,
    },
    {
      id: '3',
      shortCode: 'blog-q3',
      shortUrl: 'snip.ly/blog-q3',
      originalUrl: 'https://medium.com/engineering/scaling-url-shortener-to-1m-requests',
      clicks: 289,
      createdAt: '1 week ago',
      hasQr: true,
    },
    {
      id: '4',
      shortCode: 'promo',
      shortUrl: 'snip.ly/promo',
      originalUrl: 'https://stripe.com/customers/snip-case-study',
      alias: 'promo',
      clicks: 98,
      createdAt: '1 week ago',
      hasQr: false,
    },
    {
      id: '5',
      shortCode: 'career',
      shortUrl: 'snip.ly/career',
      originalUrl: 'https://jobs.snip.ly/senior-fullstack-engineer',
      alias: 'career',
      clicks: 47,
      createdAt: '2 weeks ago',
      expiresAt: 'in 14 days',
      hasQr: false,
    },
  ];

  get displayUrls(): ShortUrl[] {
    return this.isAuthenticated() ? this.authUrls : this.anonUrls;
  }

  copyUrl(url: ShortUrl): void {
    navigator.clipboard.writeText(url.shortUrl).then(() => {
      this.copiedId.set(url.id);
      setTimeout(() => this.copiedId.set(null), 2000);
    });
  }
}
