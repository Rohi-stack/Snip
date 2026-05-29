import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  token = signal('');
  password = signal('');
  confirmPassword = signal('');
  
  loading = signal(false);
  success = signal(false);
  errorMsg = signal<string | null>(null);
  
  // Visibility toggles
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  ngOnInit(): void {
    // Extract reset token from route query parameter
    this.route.queryParams.subscribe((params) => {
      const tok = params['token'];
      if (tok) {
        this.token.set(tok);
      } else {
        this.errorMsg.set('Invalid password reset link. The reset token is missing.');
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((val) => !val);
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.loading() || !this.token()) return;

    const pass = this.password();
    const confPass = this.confirmPassword();

    if (!pass || !confPass) {
      this.errorMsg.set('Please fill out all password fields.');
      return;
    }

    if (pass.length < 8) {
      this.errorMsg.set('Password must be at least 8 characters long.');
      return;
    }

    if (pass !== confPass) {
      this.errorMsg.set('Passwords do not match. Please verify.');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    try {
      await this.authService.resetPassword(this.token(), pass);
      this.success.set(true);
      
      // Auto redirect to login after 3 seconds
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password.';
      
      // Clean user friendly mappings
      if (msg.includes('INVALID_RESET_TOKEN') || msg.includes('Invalid')) {
        this.errorMsg.set('This password reset link is invalid. Please request a new one.');
      } else if (msg.includes('TOKEN_EXPIRED') || msg.includes('expired')) {
        this.errorMsg.set('This password reset link has expired. Reset links expire after 15 minutes.');
      } else if (msg.includes('TOKEN_ALREADY_USED') || msg.includes('already been used')) {
        this.errorMsg.set('This password reset link has already been used. Please request a new one.');
      } else {
        this.errorMsg.set(msg);
      }
    } finally {
      this.loading.set(false);
    }
  }
}
