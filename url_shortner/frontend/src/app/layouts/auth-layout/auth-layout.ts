import { Component, ViewEncapsulation } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

/**
 * AuthLayout
 *
 * ViewEncapsulation.None is intentional here.
 *
 * WHY:
 *   The child routes (Login, Signup, Verify) rendered inside <router-outlet>
 *   each produce their own Angular host elements. With the default Emulated
 *   encapsulation, every CSS rule in this file would receive a scoped attribute
 *   selector (e.g. [_nghost-xxx]) that only matches THIS component's own DOM,
 *   not the child component's DOM – so classes like .auth-card, .auth-form,
 *   .form-group etc. would silently stop working for child content.
 *
 *   Setting ViewEncapsulation.None turns this stylesheet into a globally-
 *   applied sheet (inserted once into <head>), which is safe because:
 *   – All selectors are already namespaced under .auth-layout / .auth-card /
 *     .auth-form / .google-auth-btn etc. (no bare element resets that would
 *     leak to the rest of the app).
 *   – CSS custom properties defined in :host still cascade down the tree.
 *
 * TRADE-OFF:
 *   Rules in this file are now global. Keep selectors specific to the auth
 *   namespace so they never accidentally affect dashboard or marketing pages.
 */
@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AuthLayout {}
