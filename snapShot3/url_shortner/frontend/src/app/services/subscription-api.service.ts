import { Injectable, inject } from '@angular/core';
import { AuthService } from '../core/services/auth.service';

export interface SubscriptionInfo {
  isPremium: boolean;
  tier?: string;       // 'Starter' | 'Premium'
  amount?: number;     // paise
  currency?: string;
  startsAt?: string;   // ISO
  expiresAt?: string;  // ISO
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

const BASE = '/api/v1';

@Injectable({ providedIn: 'root' })
export class SubscriptionApiService {
  private auth = inject(AuthService);

  async getMySubscription(): Promise<SubscriptionInfo> {
    const token = await this.auth.getValidAccessToken();
    if (!token) return { isPremium: false };

    const res = await fetch(`${BASE}/subscriptions/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message ?? `Error ${res.status}`);
    return json.data as SubscriptionInfo;
  }

  async createOrder(): Promise<RazorpayOrder> {
    const token = await this.auth.getValidAccessToken();
    const res = await fetch(`${BASE}/subscriptions/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message ?? `Error ${res.status}`);
    return json.data as RazorpayOrder;
  }
}

