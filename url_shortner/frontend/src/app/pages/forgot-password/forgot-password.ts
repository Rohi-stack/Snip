import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private authService = inject(AuthService);

  email = signal('');
  loading = signal(false);
  success = signal(false);
  errorMsg = signal<string | null>(null);

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.loading()) return;

    const email = this.email().trim();

    if (!email) {
      this.errorMsg.set('Please enter your email address.');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    try {
      await this.authService.forgotPassword(email);
      this.success.set(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      this.errorMsg.set(msg);
    } finally {
      this.loading.set(false);
    }
  }
}
