import { Component, signal, effect, HostListener } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet, RouterLinkActive],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.scss',
})
export class DashboardLayout {
  mobileOpen = signal(false);

  constructor() {
    effect(() => {
      if (this.mobileOpen()) {
        document.body.classList.add('menu-open');
      } else {
        document.body.classList.remove('menu-open');
      }
    });
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
