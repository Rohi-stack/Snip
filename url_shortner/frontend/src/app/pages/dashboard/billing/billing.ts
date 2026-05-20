import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import {
  SubscriptionApiService,
  type SubscriptionInfo,
} from '../../../services/subscription-api.service';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './billing.html',
  styleUrl: './billing.scss',
})
export class Billing implements OnInit {
  private subApi = inject(SubscriptionApiService);

  loading = signal(true);
  errorMsg = signal<string | null>(null);
  sub = signal<SubscriptionInfo | null>(null);

  isPremium = computed(() => this.sub()?.isPremium ?? false);
  tierLabel = computed(() => this.sub()?.tier ?? 'Free');
  expiresAt = computed(() => this.sub()?.expiresAt ?? null);
  startsAt = computed(() => this.sub()?.startsAt ?? null);
  /** Amount in rupees */
  amountRupees = computed(() => {
    const paise = this.sub()?.amount;
    return paise ? paise / 100 : 0;
  });
  currency = computed(() => this.sub()?.currency ?? 'INR');

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      const info = await this.subApi.getMySubscription();
      this.sub.set(info);
    } catch (err) {
      this.errorMsg.set(err instanceof Error ? err.message : 'Failed to load billing info.');
    } finally {
      this.loading.set(false);
    }
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
}
