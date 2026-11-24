import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BASE_API } from '../../shared/api';

/** Zone de confiance renvoyée par le back : elle informe, elle ne choisit jamais à la place de l'utilisateur. */
export type ConfianceRecherche = 'SUR' | 'A_CONFIRMER';

/** Nature de la référence : produit précis, besoin générique du catalogue ou besoin personnel de l'utilisateur. */
export type TypeReference = 'PRODUIT' | 'BESOIN_GENERIQUE' | 'BESOIN_PERSONNALISE';

export type UniteQuantite = 'ARTICLE' | 'GRAMME' | 'KILOGRAMME' | 'LITRE' | 'CENTILITRE';

/**
 * Élément du contrat commun F1/F2 de `GET /api/v1/produits`.
 * `id`, `libelle` et `codeBarres` sont garantis ; les autres champs sont des compléments facultatifs.
 */
export interface ProduitTrouve {
  id: number;
  libelle: string;
  codeBarres: string | null;
  marque?: string | null;
  quantite?: string | null;
  confiance?: ConfianceRecherche;
  type?: TypeReference;
  unites?: UniteQuantite[];
}

/**
 * Sans portée : produits précis uniquement (écrans de prix F2).
 * `liste` : ajoute les besoins génériques et les besoins personnels de l'utilisateur simulé (F1 « Ma liste »).
 */
export type PorteeRecherche = 'liste' | null;

/** Nombre minimal de caractères transmis au back ; en dessous, il répond toujours par une liste vide. */
export const LONGUEUR_MINIMALE_RECHERCHE = 2;

/** Seul point d'accès du front à `/api/v1/produits` (recherche commune F1/F2). */
@Injectable({ providedIn: 'root' })
export class ProduitsApi {
  private readonly http = inject(HttpClient);

  rechercher(recherche: string, portee: PorteeRecherche = null): Observable<ProduitTrouve[]> {
    let params = new HttpParams().set('recherche', recherche);
    if (portee) {
      params = params.set('portee', portee);
    }
    return this.http.get<ProduitTrouve[]>(`${BASE_API}/produits`, { params });
  }
}
