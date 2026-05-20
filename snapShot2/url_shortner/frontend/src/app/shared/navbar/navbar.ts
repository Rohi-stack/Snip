import { Component, HostListener, signal, effect } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent {
  isScrolled = signal(false);
  mobileOpen = signal(false);
  // Mock: set to true to preview authenticated state
  isLoggedIn = signal(false);

  constructor() {
    effect(() => {
      if (this.mobileOpen()) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled.set(window.scrollY > 20);
  }

  @HostListener('window:keydown.Escape')
  onEscape(): void {
    if (this.mobileOpen()) {
      this.closeMobile();
    }
  }

  toggleMobile(): void {
    this.mobileOpen.update(v => !v);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }
}
