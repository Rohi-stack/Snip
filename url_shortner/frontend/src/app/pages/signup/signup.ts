import { Component, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { googleSignIn } from '../../core/services/google-auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {
  private authService = inject(AuthService);
  private router = inject(Router);

  name = signal('');
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
    const name = this.name().trim();

    if (!email || !password) {
      this.errorMsg.set('Please enter your email and password.');
      return;
    }
    if (password.length < 8) {
      this.errorMsg.set('Password must be at least 8 characters.');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    try {
      await this.authService.register(email, password, name || undefined);
      this.router.navigate(['/dashboard/links']);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed. Please try again.';
      this.errorMsg.set(msg.includes('EMAIL_IN_USE') || msg.includes('already registered')
        ? 'This email is already registered. Try logging in.'
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
      if (!msg.includes('popup was closed') && !msg.includes('cancelled')) {
        this.errorMsg.set(msg);
      }
    } finally {
      this.googleLoading.set(false);
    }
  }
}
