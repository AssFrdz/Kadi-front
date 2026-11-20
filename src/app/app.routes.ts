import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'catalogue',
    title: 'Catalogue — Kadi',
    loadComponent: () => import('./features/catalogue/catalogue').then((m) => m.Catalogue),
  },
  {
    path: 'connexion',
    title: 'Se connecter — Kadi',
    loadComponent: () => import('./features/compte/connexion/connexion').then((m) => m.Connexion),
  },
  {
    path: 'inscription',
    title: 'Créer un compte — Kadi',
    loadComponent: () => import('./features/compte/inscription/inscription').then((m) => m.Inscription),
  },
  {
    path: 'verification-email',
    title: 'Vérifier mon adresse e-mail — Kadi',
    loadComponent: () =>
      import('./features/compte/verification-email/verification-email').then((m) => m.VerificationEmail),
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
