import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CompteApi } from './compte-api';

describe('CompteApi', () => {
  let api: CompteApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(CompteApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('récupère le jeton CSRF avant de créer un compte', () => {
    let resultat: unknown;
    api.inscrire('assia@example.com', 'un-mot-de-passe-solide').subscribe((reponse) => {
      resultat = reponse;
    });

    const csrf = http.expectOne('http://127.0.0.1:8080/api/v1/auth/csrf');
    expect(csrf.request.method).toBe('GET');
    expect(csrf.request.withCredentials).toBe(true);
    csrf.flush({ token: 'csrf-token', headerName: 'X-CSRF-TOKEN' });

    const inscription = http.expectOne(
      'http://127.0.0.1:8080/api/v1/auth/inscription',
    );
    expect(inscription.request.method).toBe('POST');
    expect(inscription.request.body).toEqual({
      email: 'assia@example.com',
      motDePasse: 'un-mot-de-passe-solide',
    });
    expect(inscription.request.headers.get('X-CSRF-TOKEN')).toBe('csrf-token');
    expect(inscription.request.withCredentials).toBe(true);
    inscription.flush({ email: 'assia@example.com', emailVerifie: false });

    expect(resultat).toEqual({ email: 'assia@example.com', emailVerifie: false });
  });

  it('récupère le jeton CSRF avant de confirmer l’adresse email', () => {
    let termine = false;
    api.confirmerEmail('jeton-de-verification').subscribe(() => {
      termine = true;
    });

    const csrf = http.expectOne('http://127.0.0.1:8080/api/v1/auth/csrf');
    csrf.flush({ token: 'csrf-token', headerName: 'X-CSRF-TOKEN' });

    const confirmation = http.expectOne(
      'http://127.0.0.1:8080/api/v1/auth/verification-email/confirmation',
    );
    expect(confirmation.request.method).toBe('POST');
    expect(confirmation.request.body).toEqual({ token: 'jeton-de-verification' });
    expect(confirmation.request.headers.get('X-CSRF-TOKEN')).toBe('csrf-token');
    confirmation.flush(null);

    expect(termine).toBe(true);
  });

  it('récupère le jeton CSRF avant de créer une session', () => {
    let resultat: unknown;
    api.connecter('assia@example.com', 'un-mot-de-passe-solide').subscribe((reponse) => {
      resultat = reponse;
    });

    const csrf = http.expectOne('http://127.0.0.1:8080/api/v1/auth/csrf');
    csrf.flush({ token: 'csrf-token', headerName: 'X-XSRF-TOKEN' });

    const connexion = http.expectOne('http://127.0.0.1:8080/api/v1/auth/connexion');
    expect(connexion.request.method).toBe('POST');
    expect(connexion.request.body).toEqual({
      email: 'assia@example.com',
      motDePasse: 'un-mot-de-passe-solide',
    });
    expect(connexion.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
    expect(connexion.request.withCredentials).toBe(true);
    connexion.flush({
      id: 12,
      email: 'assia@example.com',
      role: 'UTILISATEUR',
      emailVerifie: true,
    });

    expect(resultat).toEqual({
      id: 12,
      email: 'assia@example.com',
      role: 'UTILISATEUR',
      emailVerifie: true,
    });
  });

  it('lit la session courante avec les cookies', () => {
    api.lireSession().subscribe();

    const session = http.expectOne('http://127.0.0.1:8080/api/v1/auth/session');
    expect(session.request.method).toBe('GET');
    expect(session.request.withCredentials).toBe(true);
    session.flush({
      id: 12,
      email: 'assia@example.com',
      role: 'UTILISATEUR',
      emailVerifie: true,
    });
  });

  it('récupère le jeton CSRF avant de fermer la session', () => {
    api.deconnecter().subscribe();

    const csrf = http.expectOne('http://127.0.0.1:8080/api/v1/auth/csrf');
    csrf.flush({ token: 'csrf-token', headerName: 'X-XSRF-TOKEN' });

    const deconnexion = http.expectOne('http://127.0.0.1:8080/api/v1/auth/deconnexion');
    expect(deconnexion.request.method).toBe('POST');
    expect(deconnexion.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
    expect(deconnexion.request.withCredentials).toBe(true);
    deconnexion.flush(null);
  });

  it('retourne le détail d’une erreur API problem+json', () => {
    expect(
      api.lireErreur({ error: { detail: 'Adresse déjà utilisée' } }, 'Erreur'),
    ).toBe('Adresse déjà utilisée');
  });
});
