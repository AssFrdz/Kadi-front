import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BASE_API } from '../../shared/api';
import { UtilisateurCourantService } from './utilisateur-courant.service';

export const EN_TETE_UTILISATEUR = 'X-Utilisateur-Id';

/** Ajoute l'utilisateur simulé sélectionné à chaque appel de l'API Kadi. */
export const utilisateurCourantInterceptor: HttpInterceptorFn = (requete, suivant) => {
  const id = inject(UtilisateurCourantService).id();
  if (id === null || !requete.url.startsWith(BASE_API)) {
    return suivant(requete);
  }
  return suivant(requete.clone({ setHeaders: { [EN_TETE_UTILISATEUR]: String(id) } }));
};
