import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Types des réponses de l'API du prix fiable (F2), calqués sur les DTO du back. */
export type UniteDePrix = 'PIECE' | 'KILOGRAMME' | 'LITRE';
export type TypeDePreuve = 'TICKET' | 'EXPORT_FIDELITE' | 'IMPORT_ENSEIGNE' | 'ETIQUETTE' | 'SAISIE';
export type NiveauDeConfiance = 'ELEVEE' | 'MOYENNE' | 'FAIBLE';
export type MotifExclusion = 'EN_PROMOTION' | 'TROP_ANCIEN' | 'UNITE_INCOMPATIBLE' | 'DOUBLON' | 'ABERRANT';
export type StatutDeSaisie = 'NORMAL' | 'INHABITUEL' | 'SANS_REFERENCE';

export interface Releve {
  id: number | null;
  prix: number;
  unite: UniteDePrix;
  releveLe: string;
  preuve: TypeDePreuve;
  enPromotion: boolean;
}

export interface ReleveEcarte {
  releve: Releve;
  motif: MotifExclusion;
}

export interface PrixDeReference {
  prix: number;
  unite: UniteDePrix;
  confiance: { score: number; niveau: NiveauDeConfiance };
  niveauDeCalcul: 'MAGASIN' | 'ENSEIGNE';
  retenus: Releve[];
  ecartes: ReleveEcarte[];
}

/** Le verdict du contrôle de saisie : dans la réponse 201, ou dans l'erreur 422 d'un prix inhabituel. */
export interface ControleDeSaisie {
  statut: StatutDeSaisie;
  reference: number | null;
  scoreZ: number | null;
  ecartPourcent: number | null;
  demandeConfirmation: boolean;
}

/** Le corps de POST /releves ; les champs facultatifs prennent leur valeur par défaut côté back. */
export interface SaisieReleve {
  produitId: number;
  magasinId: number;
  prix: number;
  contributeur: string;
  unite?: UniteDePrix;
  preuve?: TypeDePreuve;
  enPromotion?: boolean;
  confirmerMalgreAlerte?: boolean;
}

export interface ReleveEnregistre {
  releve: Releve;
  controle: ControleDeSaisie;
}

/**
 * Seul endroit du front qui appelle l'API du prix fiable.
 * Les erreurs restent des erreurs HTTP : 404 (aucun prix, ou produit inconnu), 400 (saisie invalide)
 * et 422 (prix inhabituel non confirmé, avec le contrôle dans le corps) sont traitées par les écrans.
 */
@Injectable({ providedIn: 'root' })
export class PrixApi {
  private readonly http = inject(HttpClient);

  prixDeReference(produitId: number, magasinId: number): Observable<PrixDeReference> {
    return this.http.get<PrixDeReference>(
      `${environment.apiUrl}/produits/${produitId}/magasins/${magasinId}/prix-de-reference`,
    );
  }

  saisir(saisie: SaisieReleve): Observable<ReleveEnregistre> {
    return this.http.post<ReleveEnregistre>(`${environment.apiUrl}/releves`, saisie);
  }
}
