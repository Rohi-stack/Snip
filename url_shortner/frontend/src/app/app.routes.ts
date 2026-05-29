import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { noAuthGuard } from './guards/no-auth.guard';

export const routes: Routes = [
  // Public Routes (Marketing Layout)
  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/home/home').then((m) => m.Home),
      },
      {
        path: 'pricing',
        loadComponent: () =>
          import('./pages/pricing/pricing').then((m) => m.Pricing),
      },
      {
        path: 'company',
        loadComponent: () =>
          import('./pages/company/company').then((m) => m.Company),
      },
      {
        path: 'terms',
        loadComponent: () =>
          import('./pages/terms/terms').then((m) => m.Terms),
      },
      {
        path: 'privacy',
        loadComponent: () =>
          import('./pages/privacy/privacy').then((m) => m.Privacy),
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./pages/contact/contact').then((m) => m.Contact),
      },
    ],
  },
  
  // Authentication Routes
  {
    path: '',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/login/login').then((m) => m.Login),
      },
      {
        path: 'signup',
        loadComponent: () =>
          import('./pages/signup/signup').then((m) => m.Signup),
      },
      {
        path: 'verify',
        loadComponent: () =>
          import('./pages/verify/verify').then((m) => m.Verify),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./pages/forgot-password/forgot-password').then((m) => m.ForgotPassword),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./pages/reset-password/reset-password').then((m) => m.ResetPassword),
      },
    ],
  },
  
  // Dashboard Routes (Authenticated, dense layout)
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/dashboard-layout/dashboard-layout').then((m) => m.DashboardLayout),
    children: [
      {
        path: '',
        redirectTo: 'links',
        pathMatch: 'full'
      },
      {
        path: 'links',
        loadComponent: () =>
          import('./pages/dashboard/links/links').then((m) => m.Links),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./pages/dashboard/analytics/analytics').then((m) => m.Analytics),
      },
      {
        path: 'billing',
        loadComponent: () =>
          import('./pages/dashboard/billing/billing').then((m) => m.Billing),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/dashboard/settings/settings').then((m) => m.Settings),
      }
    ],
  },
  
  // Fallback Route
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
];
