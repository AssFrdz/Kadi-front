import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CatalogueApi } from './catalogue-api';

describe('CatalogueApi', () => {
  it('demande une page avec les cookies de session et le curseur', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(CatalogueApi);
    const http = TestBed.inject(HttpTestingController);

    api.consulter(42).subscribe();
    const requete = http.expectOne('http://127.0.0.1:8080/api/v1/catalogue/produits?apres=42');
    expect(requete.request.method).toBe('GET');
    expect(requete.request.withCredentials).toBe(false);
    requete.flush({ produits: [], prochainId: null });
    http.verify();
  });

  it('recherche sur le catalogue local avec la session', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const api = TestBed.inject(CatalogueApi);
    const http = TestBed.inject(HttpTestingController);
    api.suggerer('pâtes').subscribe();
    const requete = http.expectOne((req) => req.url.endsWith('/catalogue/produits/suggestions') && req.params.get('q') === 'pâtes');
    expect(requete.request.withCredentials).toBe(false);
    requete.flush([]);
    http.verify();
  });

  it('transmet les filtres au catalogue et à la recherche', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const api = TestBed.inject(CatalogueApi);
    const http = TestBed.inject(HttpTestingController);
    const filtres = { marque: 'Marque test', format: '500 g' };
    api.consulter(0, filtres).subscribe();
    const catalogue = http.expectOne((req) => req.url.endsWith('/catalogue/produits')
      && req.params.get('marque') === 'Marque test' && req.params.get('format') === '500 g');
    catalogue.flush({ produits: [], prochainId: null });
    api.rechercher('yaourt', null, 7, filtres).subscribe();
    const recherche = http.expectOne((req) => req.url.endsWith('/catalogue/produits/recherche')
      && req.params.get('marque') === 'Marque test' && req.params.get('format') === '500 g');
    recherche.flush({ produits: [], prochainCurseur: null });
    http.verify();
  });

  it('demande les marques correspondant à la recherche et au format', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const api = TestBed.inject(CatalogueApi);
    const http = TestBed.inject(HttpTestingController);
    api.listerMarques('yaourt', '500 g').subscribe();
    const requete = http.expectOne((req) => req.url.endsWith('/catalogue/produits/marques')
      && req.params.get('q') === 'yaourt' && req.params.get('format') === '500 g');
    expect(requete.request.withCredentials).toBe(false);
    requete.flush([{ nom: 'Test', nombre: 2 }]);
    http.verify();
  });

});
