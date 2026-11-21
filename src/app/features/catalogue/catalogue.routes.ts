import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./catalogue.page').then((m) => m.CataloguePage) },
];
