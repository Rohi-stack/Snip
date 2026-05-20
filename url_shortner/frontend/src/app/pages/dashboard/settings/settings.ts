import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  readonly auth = inject(AuthService);
  private router = inject(Router);

  /** Expose current user for template bindings */
  user = this.auth.currentUser;

  async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/']);
  }
}
