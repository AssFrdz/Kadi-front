import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./comparaison.page').then((m) => m.ComparaisonPage) },
];
