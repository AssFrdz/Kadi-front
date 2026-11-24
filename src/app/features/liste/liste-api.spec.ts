import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ListeApi } from './liste-api';

describe('ListeApi', () => {
  let api: ListeApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ListeApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('ajoute une ligne en une seule requête', () => {
    api.ajouter({ type: 'BESOIN_GENERIQUE', referenceId: 3, quantite: 1.5, unite: 'KILOGRAMME' }).subscribe();
    const requete = http.expectOne('http://127.0.0.1:8080/api/v1/liste/lignes');
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({ type: 'BESOIN_GENERIQUE', referenceId: 3, quantite: 1.5, unite: 'KILOGRAMME' });
    requete.flush({ statut: 'AJOUTEE', ligneId: 'a', lignesCandidates: [], lignes: [] });
  });

  it('modifie et supprime une ligne', () => {
    api.modifierQuantite('id-1', 3).subscribe();
    const modification = http.expectOne('http://127.0.0.1:8080/api/v1/liste/lignes/id-1');
    expect(modification.request.method).toBe('PATCH');
    expect(modification.request.body).toEqual({ quantite: 3 });
    modification.flush({ lignes: [] });

    api.supprimer('id-1').subscribe();
    const suppression = http.expectOne('http://127.0.0.1:8080/api/v1/liste/lignes/id-1');
    expect(suppression.request.method).toBe('DELETE');
    suppression.flush(null);
  });
});
