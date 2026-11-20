import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, map, of, switchMap, timer } from 'rxjs';
import { CatalogueApi, FiltresCatalogue, ProduitCatalogue } from './catalogue-api';

function longueurRecherche(texte: string): number {
  const normalise = texte.normalize('NFD').replace(/\p{M}+/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/ +/g, ' ');
  return Array.from(normalise).length;
}

@Component({
  selector: 'kadi-catalogue',
  imports: [RouterLink],
  templateUrl: './catalogue.html',
  styleUrl: './catalogue.css',
})
export class Catalogue implements OnInit {
  private readonly api = inject(CatalogueApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly recherches = new Subject<{ texte: string; curseur: string | null; filtres: FiltresCatalogue }>();
  private readonly consultations = new Subject<{ apres: number; filtres: FiltresCatalogue }>();

  readonly produits = signal<ProduitCatalogue[]>([]);
  readonly prochainId = signal<number | null>(null);
  readonly chargement = signal(false);
  readonly charge = signal(false);
  readonly nonConnecte = signal(false);
  readonly erreur = signal('');
  readonly imagesIndisponibles = signal<Set<number>>(new Set());
  readonly saisie = signal('');
  readonly suggestions = signal<ProduitCatalogue[]>([]);
  readonly rechercheEnCours = signal(false);
  readonly rechercheEffectuee = signal(false);
  readonly erreurRecherche = signal('');
  readonly prochainCurseur = signal<string | null>(null);
  readonly tousResultats = signal(false);
  readonly erreurSuite = signal(false);
  readonly filtres = signal<FiltresCatalogue>({ marque: '', format: '' });
  readonly filtresOuverts = signal(false);
  readonly filtresActifs = computed(() => !!(this.filtres().marque || this.filtres().format));
  readonly rechercheActive = computed(() => this.saisie().trim().length > 0);
  readonly produitsAffiches = computed(() => this.rechercheActive() ? this.suggestions() : this.produits());

  constructor() {
    this.recherches.pipe(
      switchMap(({ texte, curseur, filtres }) => {
        if (longueurRecherche(texte) < 3) {
          return EMPTY;
        }
        return timer(curseur === null ? 250 : 0).pipe(
          switchMap(() => this.api.rechercher(texte, curseur, curseur === null ? 7 : 20, filtres)),
          map((page) => ({ page, curseur, erreur: null })),
          catchError((erreur: unknown) => of({ page: null, curseur, erreur })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ page, curseur, erreur }) => {
      this.rechercheEnCours.set(false);
      if (page === null) {
        if (erreur instanceof HttpErrorResponse && erreur.status === 401) {
          this.nonConnecte.set(true);
          this.produits.set([]);
          this.prochainId.set(null);
        } else {
          this.erreurRecherche.set('Je n’ai pas pu rechercher dans le catalogue. Réessaie.');
          this.erreurSuite.set(curseur !== null);
        }
        return;
      }
      this.suggestions.update((actuelles) => curseur === null ? page.produits : [...actuelles, ...page.produits]);
      this.prochainCurseur.set(page.prochainCurseur);
      this.rechercheEffectuee.set(true);
    });
    this.consultations.pipe(
      switchMap(({ apres, filtres }) => this.api.consulter(apres, filtres).pipe(
        map((page) => ({ page, apres, erreur: null })),
        catchError((erreur: unknown) => of({ page: null, apres, erreur })),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ page, apres, erreur }) => {
      this.chargement.set(false);
      if (page !== null) {
        this.produits.update((produits) => apres === 0 ? page.produits : [...produits, ...page.produits]);
        this.prochainId.set(page.prochainId);
        this.charge.set(true);
      } else if (erreur instanceof HttpErrorResponse && erreur.status === 401) {
        this.nonConnecte.set(true);
        this.produits.set([]);
        this.prochainId.set(null);
      } else {
        this.erreur.set('Je n’ai pas pu charger le catalogue. Réessaie dans un instant.');
      }
    });
  }

  rechercher(texte: string): void {
    this.saisie.set(texte);
    this.suggestions.set([]);
    this.erreurRecherche.set('');
    this.rechercheEffectuee.set(false);
    this.prochainCurseur.set(null);
    this.tousResultats.set(false);
    this.erreurSuite.set(false);
    this.rechercheEnCours.set(longueurRecherche(texte) >= 3);
    this.recherches.next({ texte, curseur: null, filtres: this.filtres() });
  }

  chargerResultats(): void {
    const curseur = this.prochainCurseur();
    if (curseur === null || this.rechercheEnCours()) {
      return;
    }
    this.tousResultats.set(true);
    this.erreurRecherche.set('');
    this.erreurSuite.set(false);
    this.rechercheEnCours.set(true);
    this.recherches.next({ texte: this.saisie(), curseur, filtres: this.filtres() });
  }

  appliquerFiltres(marque: string, format: string): void {
    this.filtres.set({ marque: marque.trim(), format: format.trim() });
    this.produits.set([]);
    this.prochainId.set(null);
    this.charge.set(false);
    this.chargement.set(false);
    this.charger(0);
    this.rechercher(this.saisie());
  }

  reessayerRecherche(): void {
    if (this.erreurSuite()) {
      this.chargerResultats();
    } else {
      this.rechercher(this.saisie());
    }
  }

  imageEnErreur(id: number): void {
    this.imagesIndisponibles.update((ids) => new Set([...ids, id]));
  }

  ngOnInit(): void {
    this.charger(0);
  }

  charger(apres: number): void {
    if (this.chargement()) {
      return;
    }
    this.chargement.set(true);
    this.erreur.set('');
    this.nonConnecte.set(false);
    this.consultations.next({ apres, filtres: this.filtres() });
  }

  chargerSuite(): void {
    const prochainId = this.prochainId();
    if (prochainId !== null) {
      this.charger(prochainId);
    }
  }
}
