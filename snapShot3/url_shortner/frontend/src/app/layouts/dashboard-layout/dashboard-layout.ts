import { Component, signal, effect, HostListener, inject, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SubscriptionApiService } from '../../services/subscription-api.service';
import { UiStateService } from '../../core/services/ui-state.service';
import { CreateLinkModalComponent } from '../../shared/components/create-link-modal/create-link-modal';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet, RouterLinkActive, CreateLinkModalComponent],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.scss',
})
export class DashboardLayout implements OnInit {
  private authService = inject(AuthService);
  private subApi = inject(SubscriptionApiService);
  private router = inject(Router);
  private uiState = inject(UiStateService);

  mobileOpen = signal(false);
  isModalOpen = this.uiState.isCreateLinkModalOpen;

  user = this.authService.currentUser;
  tierLabel = signal('Free Plan');

  constructor() {
    effect(() => {
      if (this.mobileOpen()) {
        document.body.classList.add('menu-open');
      } else {
        document.body.classList.remove('menu-open');
      }
    });
  }

  async ngOnInit() {
    try {
      const sub = await this.subApi.getMySubscription();
      if (sub.isPremium) {
        this.tierLabel.set('Premium Plan');
      } else {
        this.tierLabel.set(sub.tier ? `${sub.tier} Plan` : 'Free Plan');
      }
    } catch {
      this.tierLabel.set('Free Plan');
    }
  }

  @HostListener('window:keydown.Escape')
  onEscape(): void {
    if (this.mobileOpen()) {
      this.closeMobile();
    }
    // Modal escape is handled inside the modal component itself
  }

  toggleMobile(): void {
    this.mobileOpen.update(v => !v);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  openCreateModal(): void {
    this.uiState.openCreateLinkModal();
  }

  closeCreateModal(): void {
    this.uiState.closeCreateLinkModal();
  }

  async logout(): Promise<void> {
    this.closeMobile();
    await this.authService.logout();
    this.router.navigate(['/']);
  }
}
