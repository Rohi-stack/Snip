import { Injectable, inject } from '@angular/core';
import { AuthService } from '../core/services/auth.service';

const BASE = '/api/v1';

export interface CheckoutResponse {
  url: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentsApiService {
  private authService = inject(AuthService);

  /**
   * Creates a Stripe Checkout session for the given tier.
   * Returns the URL to redirect the user to.
   */
  async createCheckoutSession(tier: 'starter' | 'premium'): Promise<CheckoutResponse> {
    const token = await this.authService.getValidAccessToken();
    if (!token) throw new Error('You must be logged in to upgrade.');

    const res = await fetch(`${BASE}/subscriptions/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tier }),
    });

    const text = await res.text();
    if (!text || text.trim() === '') throw new Error('Empty response from payments server.');

    const json = JSON.parse(text);
    if (!res.ok) throw new Error(json?.error?.message ?? json?.message ?? `Error ${res.status}`);

    return json.data as CheckoutResponse;
  }
}
