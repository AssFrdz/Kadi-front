import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { utilisateurCourantInterceptor } from './utilisateur-courant.interceptor';
import { CLE_STOCKAGE_UTILISATEUR, UtilisateurCourantService, UtilisateurSimule } from './utilisateur-courant.service';

const API = 'http://127.0.0.1:8080/api/v1';
const PROFILS: UtilisateurSimule[] = [
  { id: 1, nomAffiche: 'Admin Kadi', role: 'ADMINISTRATEUR' },
  { id: 2, nomAffiche: 'Karim (consommateur)', role: 'UTILISATEUR' },
  { id: 3, nomAffiche: 'Sophie (consommatrice)', role: 'UTILISATEUR' },
];

describe('UtilisateurCourantService et intercepteur', () => {
  let http: HttpTestingController;

  function configurer() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([utilisateurCourantInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(UtilisateurCourantService);
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => http.verify());

  it('sélectionne le premier consommateur par défaut et le mémorise', () => {
    const service = configurer();
    service.charger();
    http.expectOne(`${API}/utilisateurs`).flush(PROFILS);
    expect(service.id()).toBe(2);
    expect(service.courant()?.nomAffiche).toBe('Karim (consommateur)');
    expect(localStorage.getItem(CLE_STOCKAGE_UTILISATEUR)).toBe('2');
  });

  it('ajoute X-Utilisateur-Id aux appels de l’API, et seulement à eux', () => {
    const service = configurer();
    service.choisir(3);
    const client = TestBed.inject(HttpClient);

    client.get(`${API}/liste`).subscribe();
    expect(http.expectOne(`${API}/liste`).request.headers.get('X-Utilisateur-Id')).toBe('3');

    client.get('https://exemple.test/autre').subscribe();
    expect(http.expectOne('https://exemple.test/autre').request.headers.has('X-Utilisateur-Id')).toBe(false);
  });

});
