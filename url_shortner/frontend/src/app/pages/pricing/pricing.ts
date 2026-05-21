import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PaymentsApiService } from '../../services/payments-api.service';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [],
  templateUrl: './pricing.html',
  styleUrl: './pricing.scss',
})
export class Pricing {
  private authService = inject(AuthService);
  private paymentsApi = inject(PaymentsApiService);
  private router = inject(Router);

  loadingTier = signal<string | null>(null);
  errorMsg = signal<string | null>(null);

  async onUpgrade(tier: 'starter' | 'premium'): Promise<void> {
    if (this.loadingTier()) return;

    // Must be logged in to pay
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/pricing' } });
      return;
    }

    this.loadingTier.set(tier);
    this.errorMsg.set(null);

    try {
      const { url } = await this.paymentsApi.createCheckoutSession(tier);
      // Hard redirect to Stripe Checkout
      window.location.href = url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start checkout. Please try again.';
      this.errorMsg.set(msg);
      this.loadingTier.set(null);
    }
  }

  onGetStarted(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard/links']);
    } else {
      this.router.navigate(['/signup']);
    }
  }
}
