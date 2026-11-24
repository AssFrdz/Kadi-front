import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { BASE_API } from '../../shared/api';

export type RoleUtilisateur = 'UTILISATEUR' | 'ADMINISTRATEUR';

/** Profil simulé renvoyé par `GET /api/v1/utilisateurs`. */
export interface UtilisateurSimule {
  id: number;
  nomAffiche: string;
  role: RoleUtilisateur;
}

export const CLE_STOCKAGE_UTILISATEUR = 'kadi.utilisateurCourant';

/**
 * Kadi n'a pas de connexion (consigne du projet) : l'utilisateur courant est choisi dans la liste déroulante
 * « Utilisateur actuel ». Son id est gardé dans `localStorage` et envoyé à l'API par l'intercepteur.
 */
@Injectable({ providedIn: 'root' })
export class UtilisateurCourantService {
  private readonly http = inject(HttpClient);

  readonly utilisateurs = signal<UtilisateurSimule[]>([]);
  readonly id = signal<number | null>(lireIdStocke());
  readonly erreur = signal('');
  readonly courant = computed(() => this.utilisateurs().find((u) => u.id === this.id()) ?? null);

  charger(): void {
    this.erreur.set('');
    this.http.get<UtilisateurSimule[]>(`${BASE_API}/utilisateurs`).subscribe({
      next: (utilisateurs) => {
        this.utilisateurs.set(utilisateurs);
        if (!utilisateurs.some((u) => u.id === this.id())) {
          // Premier consommateur par défaut, ou le premier profil s'il n'y a pas de consommateur.
          const parDefaut = utilisateurs.find((u) => u.role === 'UTILISATEUR') ?? utilisateurs[0];
          this.choisir(parDefaut?.id ?? null);
        }
      },
      error: () => this.erreur.set('Impossible de charger les utilisateurs.'),
    });
  }

  choisir(id: number | null): void {
    this.id.set(id);
    try {
      if (id === null) {
        localStorage.removeItem(CLE_STOCKAGE_UTILISATEUR);
      } else {
        localStorage.setItem(CLE_STOCKAGE_UTILISATEUR, String(id));
      }
    } catch {
      // Stockage indisponible (navigation privée stricte) : le choix vaut pour la page ouverte.
    }
  }
}

function lireIdStocke(): number | null {
  try {
    const valeur = Number(localStorage.getItem(CLE_STOCKAGE_UTILISATEUR));
    return Number.isInteger(valeur) && valeur > 0 ? valeur : null;
  } catch {
    return null;
  }
}
