import { Injectable, inject } from '@angular/core';
import { AuthService } from '../core/services/auth.service';

export type AnalyticsPeriod = '7d' | '30d' | 'all';

export interface TopLink {
  urlId: string;
  shortCode: string;
  originalUrl: string;
  clicks: number;
}

export interface DeviceStat {
  device: string;
  clicks: number;
  percent: number;
}

export interface ReferrerStat {
  referrer: string;
  clicks: number;
}

export interface DayStat {
  date: string;
  clicks: number;
}

export interface AnalyticsOverview {
  totalClicks: number;
  topLinks: TopLink[];
  deviceBreakdown: DeviceStat[];
  topReferrers: ReferrerStat[];
  clicksOverTime: DayStat[];
}

const BASE = '/api/v1';

@Injectable({ providedIn: 'root' })
export class AnalyticsApiService {
  private auth = inject(AuthService);

  async getOverview(period: AnalyticsPeriod = '7d'): Promise<AnalyticsOverview> {
    const token = await this.auth.getValidAccessToken();
    const res = await fetch(`${BASE}/analytics/overview?period=${period}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message ?? `Error ${res.status}`);
    return json.data as AnalyticsOverview;
  }
}
