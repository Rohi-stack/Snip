import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-links',
  standalone: true,
  templateUrl: './links.html',
  styleUrl: './links.scss',
})
export class Links {
  // Mock data for links table
  links = signal([
    {
      id: '1',
      originalUrl: 'https://producthunt.com/posts/snip-saas-url-shortener',
      shortUrl: 'snip.ly/launch24',
      alias: 'launch24',
      clicks: 1284,
      expiresAt: '2026-06-20',
      createdAt: '2 days ago',
      status: 'active'
    },
    {
      id: '2',
      originalUrl: 'https://docs.snip.ly/api/v2/getting-started',
      shortUrl: 'snip.ly/docs-v2',
      alias: 'docs-v2',
      clicks: 542,
      expiresAt: '2026-06-15',
      createdAt: '4 days ago',
      status: 'active'
    },
    {
      id: '3',
      originalUrl: 'https://medium.com/engineering/scaling',
      shortUrl: 'snip.ly/blog-q3',
      alias: null,
      clicks: 289,
      expiresAt: '2026-05-18',
      createdAt: '1 week ago',
      status: 'expired'
    }
  ]);
}
