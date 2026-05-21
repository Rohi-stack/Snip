import { Component, HostListener, signal, effect, inject, OnInit, ElementRef } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SubscriptionApiService } from '../../services/subscription-api.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent implements OnInit {
  private authService = inject(AuthService);
  private subApi = inject(SubscriptionApiService);
  private router = inject(Router);
  private elRef = inject(ElementRef);

  isScrolled = signal(false);
  mobileOpen = signal(false);
  
  isLoggedIn = this.authService.isLoggedIn;
  user = this.authService.currentUser;
  tierLabel = signal('');
  dropdownOpen = signal(false);

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
    if (this.isLoggedIn()) {
      try {
        const sub = await this.subApi.getMySubscription();
        if (sub.isPremium) {
          this.tierLabel.set('Premium');
        } else {
          this.tierLabel.set(sub.tier ? `${sub.tier}` : 'Free');
        }
      } catch {
        this.tierLabel.set('Free');
      }
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled.set(window.scrollY > 20);
  }

  @HostListener('window:keydown.Escape')
  onEscape(): void {
    if (this.mobileOpen()) this.closeMobile();
    if (this.dropdownOpen()) this.closeDropdown();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (this.dropdownOpen()) {
      const isDropdownClick = this.elRef.nativeElement.querySelector('.profile-dropdown-container')?.contains(event.target as Node);
      if (!isDropdownClick) {
        this.closeDropdown();
      }
    }
  }

  toggleMobile(): void {
    this.mobileOpen.update(v => !v);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  toggleDropdown(): void {
    this.dropdownOpen.update(v => !v);
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  async logout(): Promise<void> {
    this.closeDropdown();
    this.closeMobile();
    await this.authService.logout();
    this.router.navigate(['/']);
  }
}
