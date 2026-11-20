import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { BASE_API } from '../../shared/api';

interface JetonCsrf {
  token: string;
  headerName: string;
}

export interface InscriptionReponse {
  email: string;
  emailVerifie: boolean;
}

export interface CompteSession {
  id: number;
  email: string;
  role: 'UTILISATEUR' | 'ADMINISTRATEUR';
  emailVerifie: boolean;
}

interface ErreurApi {
  detail?: string;
  title?: string;
}

@Injectable({ providedIn: 'root' })
export class CompteApi {
  private readonly http = inject(HttpClient);
  private readonly baseApi = BASE_API;

  inscrire(email: string, motDePasse: string): Observable<InscriptionReponse> {
    return this.avecCsrf((headers) =>
      this.http.post<InscriptionReponse>(
        `${this.baseApi}/auth/inscription`,
        { email, motDePasse },
        { headers, withCredentials: true },
      ),
    );
  }

  confirmerEmail(token: string): Observable<void> {
    return this.avecCsrf((headers) =>
      this.http.post<void>(
        `${this.baseApi}/auth/verification-email/confirmation`,
        { token },
        { headers, withCredentials: true },
      ),
    );
  }

  connecter(email: string, motDePasse: string): Observable<CompteSession> {
    return this.avecCsrf((headers) =>
      this.http.post<CompteSession>(
        `${this.baseApi}/auth/connexion`,
        { email, motDePasse },
        { headers, withCredentials: true },
      ),
    );
  }

  lireSession(): Observable<CompteSession> {
    return this.http.get<CompteSession>(`${this.baseApi}/auth/session`, {
      withCredentials: true,
    });
  }

  deconnecter(): Observable<void> {
    return this.avecCsrf((headers) =>
      this.http.post<void>(
        `${this.baseApi}/auth/deconnexion`,
        null,
        { headers, withCredentials: true },
      ),
    );
  }

  lireErreur(erreur: unknown, messageParDefaut: string): string {
    if (typeof erreur === 'object' && erreur !== null && 'error' in erreur) {
      const corps = (erreur as { error: ErreurApi | string }).error;
      if (typeof corps === 'object' && corps !== null) {
        return corps.detail ?? corps.title ?? messageParDefaut;
      }
    }

    return messageParDefaut;
  }

  private avecCsrf<T>(requete: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    return this.http
      .get<JetonCsrf>(`${this.baseApi}/auth/csrf`, { withCredentials: true })
      .pipe(
        switchMap(({ token, headerName }) =>
          requete(new HttpHeaders().set(headerName, token)),
        ),
      );
  }
}
