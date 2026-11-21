import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Info {
  name: string;
  version: string;
}

/** Endpoint témoin : vérifie que le front joint bien l'API. */
@Injectable({ providedIn: 'root' })
export class InfoApi {
  private readonly http = inject(HttpClient);

  lire(): Observable<Info> {
    return this.http.get<Info>(`${environment.apiUrl}/info`);
  }
}
