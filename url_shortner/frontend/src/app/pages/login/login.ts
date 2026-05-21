import { Component, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { googleSignIn } from '../../core/services/google-auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = signal('');
  password = signal('');
  loading = signal(false);
  googleLoading = signal(false);
  errorMsg = signal<string | null>(null);

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.loading()) return;

    const email = this.email().trim();
    const password = this.password();

    if (!email || !password) {
      this.errorMsg.set('Please enter your email and password.');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    try {
      await this.authService.login(email, password);
      this.router.navigate(['/dashboard/links']);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      this.errorMsg.set(msg.includes('INVALID_CREDENTIALS') || msg.includes('Invalid credentials')
        ? 'Incorrect email or password.'
        : msg);
    } finally {
      this.loading.set(false);
    }
  }

  async onGoogleSignIn(): Promise<void> {
    if (this.googleLoading() || this.loading()) return;
    this.googleLoading.set(true);
    this.errorMsg.set(null);
    try {
      const { user, tokens } = await googleSignIn();
      this.authService.loginWithGoogleResult(user, tokens);
      this.router.navigate(['/dashboard/links']);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      // Don't show error for user cancels
      if (!msg.includes('popup was closed') && !msg.includes('cancelled')) {
        this.errorMsg.set(msg);
      }
    } finally {
      this.googleLoading.set(false);
    }
  }
}
