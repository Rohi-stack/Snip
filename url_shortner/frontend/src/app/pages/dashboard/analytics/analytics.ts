import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { AnalyticsApiService, type AnalyticsOverview, type AnalyticsPeriod } from '../../../services/analytics-api.service';
import { UiStateService } from '../../../core/services/ui-state.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [DecimalPipe, TitleCasePipe],
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
})
export class Analytics implements OnInit {
  private analyticsApi = inject(AnalyticsApiService);
  uiState = inject(UiStateService);

  loading = signal(true);
  errorMsg = signal<string | null>(null);
  period = signal<AnalyticsPeriod>('7d');
  data = signal<AnalyticsOverview | null>(null);

  totalClicks = computed(() => this.data()?.totalClicks ?? 0);
  topLinks = computed(() => this.data()?.topLinks ?? []);
  deviceBreakdown = computed(() => this.data()?.deviceBreakdown ?? []);
  topReferrers = computed(() => this.data()?.topReferrers ?? []);
  clicksOverTime = computed(() => this.data()?.clicksOverTime ?? []);

  /** Scale bar heights relative to max value */
  maxDayClicks = computed(() => {
    const series = this.clicksOverTime();
    return series.length ? Math.max(...series.map(d => d.clicks), 1) : 1;
  });

  hasData = computed(() => this.totalClicks() > 0);

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      const overview = await this.analyticsApi.getOverview(this.period());
      this.data.set(overview);
    } catch (err) {
      this.errorMsg.set(err instanceof Error ? err.message : 'Failed to load analytics.');
    } finally {
      this.loading.set(false);
    }
  }

  onPeriodChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as AnalyticsPeriod;
    this.period.set(val);
    this.load();
  }

  barHeight(clicks: number): string {
    const pct = Math.round((clicks / this.maxDayClicks()) * 100);
    return `${Math.max(pct, 3)}%`;
  }

  dayLabel(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3);
  }

  /** Reference colour for device/referrer dots */
  dotColor(index: number): string {
    const colors = ['var(--color-orange)', '#60a5fa', '#34d399', '#a78bfa', '#f87171'];
    return colors[index % colors.length];
  }

  shortDomain(referrer: string): string {
    try {
      return new URL(referrer).hostname.replace('www.', '');
    } catch {
      return referrer;
    }
  }
}
