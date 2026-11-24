import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'catalogue',
    title: 'Catalogue — Kadi',
    loadComponent: () => import('./features/catalogue/catalogue').then((m) => m.Catalogue),
  },
  {
    path: 'liste',
    title: 'Ma liste — Kadi',
    loadComponent: () => import('./features/liste/liste').then((m) => m.Liste),
  },
  {
    path: '',
    title: 'Kadi — Les bons comptes font les bonnes courses',
    loadComponent: () => import('./features/accueil/accueil').then((m) => m.Accueil),
  },
  {
    path: 'charte',
    title: 'Charte visuelle — Kadi',
    loadComponent: () => import('./features/charte/charte').then((m) => m.Charte),
  },
  { path: '**', redirectTo: '' },
];
