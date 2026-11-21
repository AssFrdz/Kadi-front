import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MagasinTrouve {
  id: number;
  nom: string;
  enseigne: string;
}

/** Recherche de magasins par mots du nom ou de l'enseigne. */
@Injectable({ providedIn: 'root' })
export class MagasinsApi {
  private readonly http = inject(HttpClient);

  rechercher(texte: string): Observable<MagasinTrouve[]> {
    return this.http.get<MagasinTrouve[]>(`${environment.apiUrl}/magasins`, { params: { recherche: texte } });
  }
}
