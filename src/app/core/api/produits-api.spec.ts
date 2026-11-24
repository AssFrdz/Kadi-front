import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ProduitsApi } from './produits-api';

describe('ProduitsApi', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }));

  it('interroge la recherche commune avec la session et sans portée par défaut (contrat F2)', () => {
    const api = TestBed.inject(ProduitsApi);
    const http = TestBed.inject(HttpTestingController);
    let resultat: unknown;

    api.rechercher('lait écrémé 1l').subscribe((produits) => (resultat = produits));
    const requete = http.expectOne((req) => req.url === 'http://127.0.0.1:8080/api/v1/produits'
      && req.params.get('recherche') === 'lait écrémé 1l' && !req.params.has('portee'));
    expect(requete.request.method).toBe('GET');
    expect(requete.request.withCredentials).toBe(false);
    requete.flush([{ id: 1, libelle: 'Lactel Demi-écrémé 1 L', codeBarres: '3428272960015' }]);

    expect(resultat).toEqual([{ id: 1, libelle: 'Lactel Demi-écrémé 1 L', codeBarres: '3428272960015' }]);
    http.verify();
  });

  it('transmet la portée « liste » pour inclure besoins génériques et personnels', () => {
    const api = TestBed.inject(ProduitsApi);
    const http = TestBed.inject(HttpTestingController);
    api.rechercher('pommes', 'liste').subscribe();
    http.expectOne((req) => req.params.get('portee') === 'liste').flush([]);
    http.verify();
  });
});
