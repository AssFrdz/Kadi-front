import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProduitTrouve {
  id: number;
  libelle: string;
  codeBarres: string | null;
}

/**
 * Recherche de produits par mots du libellé, ou par code-barres tapé en chiffres.
 * Le back sert pour l'instant une recherche provisoire ; celle du catalogue (F1) la remplacera à la même adresse.
 */
@Injectable({ providedIn: 'root' })
export class ProduitsApi {
  private readonly http = inject(HttpClient);

  rechercher(texte: string): Observable<ProduitTrouve[]> {
    return this.http.get<ProduitTrouve[]>(`${environment.apiUrl}/produits`, { params: { recherche: texte } });
  }
}
