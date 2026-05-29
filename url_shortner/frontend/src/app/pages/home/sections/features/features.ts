import { Component, signal } from '@angular/core';
import type { Feature } from '../../../../models/feature.model';

@Component({
  selector: 'app-features',
  imports: [],
  templateUrl: './features.html',
  styleUrl: './features.scss',
})
export class FeaturesComponent {
  features: Feature[] = [
    {
      id: 'analytics',
      iconType: 'analytics',
      title: 'Smart Analytics',
      description: 'Real-time click tracking with referrer data, geographic insights, and device breakdowns.',
    },
    {
      id: 'qr',
      iconType: 'qr',
      title: 'Dynamic QR Codes',
      description: 'Generate styled QR codes with orange tint and embedded branding — not your average black-and-white.',
      isPremium: true,
    },
    {
      id: 'alias',
      iconType: 'alias',
      title: 'Premium Aliases',
      description: 'Create custom slugs like dashurl.in/your-brand for a clean, memorable link experience.',
      isPremium: true,
    },
    {
      id: 'expiry',
      iconType: 'expiry',
      title: 'Link Expiry',
      description: 'Auto-expire links after a set duration. Perfect for time-limited campaigns and promotions.',
    },
    {
      id: 'redirect',
      iconType: 'redirect',
      title: 'Fast Redirects',
      description: 'Edge-optimized infrastructure delivers sub-50ms redirects globally, every time.',
    },
    {
      id: 'plans',
      iconType: 'plans',
      title: 'Flexible Plans',
      description: 'Start free, upgrade when you need more. Pro plans unlock unlimited links and advanced features.',
    },
  ];
}
