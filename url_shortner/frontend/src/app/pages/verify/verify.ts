import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './verify.html',
  styleUrl: './verify.scss',
})
export class Verify implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = signal('');
  otpCode = signal('');
  loading = signal(false);
  resending = signal(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // Cooldown timer state
  cooldownSeconds = signal(0);
  private timerInterval: any = null;

  ngOnInit(): void {
    // Extract email from query parameter
    this.route.queryParams.subscribe((params) => {
      if (params['email']) {
        this.email.set(params['email']);
      }
    });

    // Start verification cooldown if previous was requested
    this.cooldownSeconds.set(60);
    this.startCooldownTimer();
  }

  ngOnDestroy(): void {
    this.stopCooldownTimer();
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.loading()) return;

    const otp = this.otpCode().trim();
    const email = this.email().trim();

    if (!email) {
      this.errorMsg.set('Email address is missing. Please sign up or log in again.');
      return;
    }

    if (!otp || otp.length !== 6 || isNaN(Number(otp))) {
      this.errorMsg.set('Please enter a valid 6-digit numeric verification code.');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    try {
      await this.authService.verifyOtp(email, otp);
      this.successMsg.set('Account verified successfully! Redirecting...');
      setTimeout(() => {
        this.router.navigate(['/dashboard/links']);
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed. Please try again.';
      this.errorMsg.set(msg.includes('INVALID_OTP') || msg.includes('Incorrect')
        ? 'The verification code you entered is incorrect.'
        : msg.includes('OTP_EXPIRED') || msg.includes('expired')
        ? 'This verification code has expired. Please request a new one.'
        : msg);
    } finally {
      this.loading.set(false);
    }
  }

  async onResend(): Promise<void> {
    if (this.cooldownSeconds() > 0 || this.resending() || this.loading()) return;

    const email = this.email().trim();
    if (!email) {
      this.errorMsg.set('Email address is missing.');
      return;
    }

    this.resending.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    try {
      await this.authService.resendOtp(email);
      this.successMsg.set('A fresh 6-digit verification code has been sent to your email.');
      this.cooldownSeconds.set(60);
      this.startCooldownTimer();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend code.';
      this.errorMsg.set(msg);
    } finally {
      this.resending.set(false);
    }
  }

  private startCooldownTimer(): void {
    this.stopCooldownTimer();
    this.timerInterval = setInterval(() => {
      const secs = this.cooldownSeconds();
      if (secs <= 1) {
        this.cooldownSeconds.set(0);
        this.stopCooldownTimer();
      } else {
        this.cooldownSeconds.set(secs - 1);
      }
    }, 1000);
  }

  private stopCooldownTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
