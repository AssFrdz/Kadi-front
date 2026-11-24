import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BASE_API } from '../../shared/api';

export type StatutProposition = 'EN_ATTENTE' | 'VALIDE' | 'REFUSE';
export type NatureBesoin = 'SOLIDE' | 'LIQUIDE' | 'UNITAIRE';

/** Besoin personnel proposé au catalogue commun par un utilisateur. */
export interface Proposition {
  id: number;
  libelle: string;
  auteur: string;
  statut: StatutProposition;
  creeLe: string | null;
  /** Libellé du besoin commun après validation (peut différer de la saisie d'origine). */
  libelleCommun: string | null;
}

export interface BesoinGenerique {
  id: number;
  libelle: string;
  nature: NatureBesoin;
}

export interface DemandeValidation {
  libelle?: string | null;
  nature?: NatureBesoin | null;
  besoinExistantId?: number | null;
}

export interface Validation {
  besoinGeneriqueId: number;
  libelle: string;
  rattache: boolean;
}

/** Seul point d'accès du front à `/api/v1/admin/besoins` (réservé au profil administrateur). */
@Injectable({ providedIn: 'root' })
export class ModerationApi {
  private readonly http = inject(HttpClient);

  lister(statut: StatutProposition): Observable<Proposition[]> {
    return this.http.get<Proposition[]>(`${BASE_API}/admin/besoins`, { params: new HttpParams().set('statut', statut) });
  }

  besoinsGeneriques(): Observable<BesoinGenerique[]> {
    return this.http.get<BesoinGenerique[]>(`${BASE_API}/admin/besoins/generiques`);
  }

  valider(id: number, demande: DemandeValidation): Observable<Validation> {
    return this.http.post<Validation>(`${BASE_API}/admin/besoins/${id}/validation`, demande);
  }

  refuser(id: number): Observable<void> {
    return this.http.post<void>(`${BASE_API}/admin/besoins/${id}/refus`, null);
  }
}
