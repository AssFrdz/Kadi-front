import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'catalogue' },
  {
    path: 'catalogue',
    loadChildren: () => import('./features/catalogue/catalogue.routes').then((m) => m.routes),
  },
  {
    path: 'prix',
    loadChildren: () => import('./features/prix/prix.routes').then((m) => m.routes),
  },
  {
    path: 'comparaison',
    loadChildren: () => import('./features/comparaison/comparaison.routes').then((m) => m.routes),
  },
];
