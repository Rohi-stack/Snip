import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Using a mock auth state for frontend routing refinement.
  // Set to true to view the dashboard properly during dev if needed,
  // or trigger it via the login/signup forms.
  isLoggedIn = signal(false);

  login() {
    this.isLoggedIn.set(true);
  }

  logout() {
    this.isLoggedIn.set(false);
  }
}
