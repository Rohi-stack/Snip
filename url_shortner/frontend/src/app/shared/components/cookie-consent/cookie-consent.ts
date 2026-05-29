import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cookie-consent.html',
  styleUrl: './cookie-consent.scss',
})
export class CookieConsent implements OnInit {
  visible = signal(false);
  showDetails = signal(false);

  ngOnInit(): void {
    const consent = localStorage.getItem('dashurl_cookie_consent');
    if (!consent) {
      // Delay showing the banner slightly for a polished loading feel
      setTimeout(() => {
        this.visible.set(true);
      }, 1000);
    }
  }

  acceptAll(): void {
    localStorage.setItem('dashurl_cookie_consent', 'all');
    this.visible.set(false);
  }

  acceptEssential(): void {
    localStorage.setItem('dashurl_cookie_consent', 'essential');
    this.visible.set(false);
  }

  toggleDetails(event: Event): void {
    event.preventDefault();
    this.showDetails.update((v) => !v);
  }
}
