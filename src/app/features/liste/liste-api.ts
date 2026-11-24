import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TypeReference, UniteQuantite } from '../../core/api/produits-api';
import { BASE_API } from '../../shared/api';

export interface LigneListe {
  id: string;
  type: TypeReference;
  referenceId: number;
  libelle: string;
  marque: string | null;
  formatProduit: string | null;
  quantite: number;
  unite: UniteQuantite;
  formatSouhaite: string | null;
  statutBesoin: 'EN_ATTENTE' | 'VALIDE' | 'REFUSE' | null;
  unitesAutorisees: UniteQuantite[];
}

export interface Liste {
  lignes: LigneListe[];
}

export interface DemandeAjout {
  type: TypeReference;
  referenceId?: number | null;
  libelle?: string | null;
  quantite: number;
  unite: UniteQuantite;
  formatSouhaite?: string | null;
  decision?: 'FUSIONNER' | 'SEPARER';
  ligneAFusionner?: string;
}

export interface ResultatAjout extends Liste {
  statut: 'AJOUTEE' | 'FUSIONNEE' | 'CONFIRMATION_REQUISE';
  ligneId: string | null;
  lignesCandidates: string[];
}

/** Seul point d'accès du front à `/api/v1/liste`. L'utilisateur simulé est ajouté par l'intercepteur. */
@Injectable({ providedIn: 'root' })
export class ListeApi {
  private readonly http = inject(HttpClient);

  consulter(): Observable<Liste> {
    return this.http.get<Liste>(`${BASE_API}/liste`);
  }

  ajouter(demande: DemandeAjout): Observable<ResultatAjout> {
    return this.http.post<ResultatAjout>(`${BASE_API}/liste/lignes`, demande);
  }

  modifierQuantite(ligneId: string, quantite: number): Observable<Liste> {
    return this.http.patch<Liste>(`${BASE_API}/liste/lignes/${encodeURIComponent(ligneId)}`, { quantite });
  }

  supprimer(ligneId: string): Observable<void> {
    return this.http.delete<void>(`${BASE_API}/liste/lignes/${encodeURIComponent(ligneId)}`);
  }
}
