import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CatalogueApi } from './catalogue-api';

describe('CatalogueApi', () => {
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
