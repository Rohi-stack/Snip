import { Injectable, inject } from '@angular/core';
import { AuthService } from '../core/services/auth.service';
import type { ShortenApiResponse, ApiSuccessEnvelope } from '../models/url.model';

export interface UrlListItem {
  id: string;
  originalUrl: string;
  shortCode: string;
  expiresAt: string;
  status: string;
  tier: string;
  quotaLimitPerDay: number;
  clickCount: number;
  createdAt: string;
}

export interface UrlListResult {
  urls: UrlListItem[];
  total: number;
  page: number;
  pageSize: number;
}

const BASE = '/api/v1';

@Injectable({ providedIn: 'root' })
export class UrlApiService {
  private auth = inject(AuthService);

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.auth.getValidAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async createUrl(originalUrl: string, alias?: string): Promise<ShortenApiResponse> {
    const headers = await this.authHeaders();
    const body: Record<string, string> = { originalUrl };
    if (alias?.trim()) body['alias'] = alias.trim();

    const res = await fetch(`${BASE}/urls`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(body),
    });
    const json = await res.json() as ApiSuccessEnvelope<ShortenApiResponse> | { message?: string };
    if (!res.ok) throw new Error((json as { message?: string }).message ?? `Error ${res.status}`);
    return (json as ApiSuccessEnvelope<ShortenApiResponse>).data;
  }

  async listMyUrls(page = 1, pageSize = 20): Promise<UrlListResult> {
    const headers = await this.authHeaders();
    const res = await fetch(`${BASE}/urls?page=${page}&pageSize=${pageSize}`, {
      headers,
      credentials: 'include',
    });
    const json = await res.json() as ApiSuccessEnvelope<UrlListResult> | { message?: string };
    if (!res.ok) throw new Error((json as { message?: string }).message ?? `Error ${res.status}`);
    return (json as ApiSuccessEnvelope<UrlListResult>).data;
  }

  async deleteUrl(id: string): Promise<void> {
    const headers = await this.authHeaders();
    const res = await fetch(`${BASE}/urls/${id}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { message?: string }).message ?? `Error ${res.status}`);
    }
  }
}
