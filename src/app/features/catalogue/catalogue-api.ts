import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BASE_API } from '../../shared/api';

export interface ProduitCatalogue {
  id: number;
  libelle: string;
  codeBarres: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  imageAuteur: string | null;
  marque: string | null;
  format: string | null;
}

export interface PageCatalogue {
  produits: ProduitCatalogue[];
  prochainId: number | null;
}

export interface PageRecherche {
  produits: ProduitCatalogue[];
  prochainCurseur: string | null;
}

export interface FiltresCatalogue {
  marque: string;
  format: string;
}

export interface MarqueCatalogue {
  nom: string;
  nombre: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogueApi {
  private readonly http = inject(HttpClient);

  consulter(apres: number, filtres: FiltresCatalogue = { marque: '', format: '' }): Observable<PageCatalogue> {
    return this.http.get<PageCatalogue>(`${BASE_API}/catalogue/produits`, {
      params: this.ajouterFiltres(new HttpParams().set('apres', apres), filtres),
    });
  }

  consulterParNom(apres: string | null, filtres: FiltresCatalogue): Observable<PageRecherche> {
    let params = this.ajouterFiltres(new HttpParams(), filtres);
    if (apres !== null) {
      params = params.set('apres', apres);
    }
    return this.http.get<PageRecherche>(`${BASE_API}/catalogue/produits/par-nom`, {
      params,
    });
  }

  listerMarques(q: string, format: string): Observable<MarqueCatalogue[]> {
    let params = new HttpParams().set('q', q);
    if (format) {
      params = params.set('format', format);
    }
    return this.http.get<MarqueCatalogue[]>(`${BASE_API}/catalogue/produits/marques`, {
      params,
    });
  }

  suggerer(q: string, filtres: FiltresCatalogue = { marque: '', format: '' }): Observable<ProduitCatalogue[]> {
    return this.http.get<ProduitCatalogue[]>(`${BASE_API}/catalogue/produits/suggestions`, {
      params: this.ajouterFiltres(new HttpParams().set('q', q), filtres),
    });
  }

  rechercher(q: string, apres: string | null, taille: number, filtres: FiltresCatalogue = { marque: '', format: '' }): Observable<PageRecherche> {
    let params = this.ajouterFiltres(new HttpParams().set('q', q).set('taille', taille), filtres);
    if (apres !== null) {
      params = params.set('apres', apres);
    }
    return this.http.get<PageRecherche>(`${BASE_API}/catalogue/produits/recherche`, {
      params,
    });
  }

  private ajouterFiltres(params: HttpParams, filtres: FiltresCatalogue): HttpParams {
    if (filtres.marque) {
      params = params.set('marque', filtres.marque);
    }
    if (filtres.format) {
      params = params.set('format', filtres.format);
    }
    return params;
  }
}
