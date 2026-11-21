import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./prix.page').then((m) => m.PrixPage) },
];
