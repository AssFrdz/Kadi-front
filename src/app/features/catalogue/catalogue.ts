import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EMPTY, Observable, Subject, catchError, map, of, switchMap, timer } from 'rxjs';
import { UtilisateurCourantService } from '../../core/utilisateur/utilisateur-courant.service';
import { DemandeAjout, ListeApi } from '../liste/liste-api';
import { CatalogueApi, FiltresCatalogue, MarqueCatalogue, ProduitCatalogue } from './catalogue-api';
import { IllustrationProduit, illustrationProduit } from './illustration-produit';

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
  private readonly liste = inject(ListeApi);
  private readonly utilisateur = inject(UtilisateurCourantService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly recherches = new Subject<{ texte: string; curseur: string | null; filtres: FiltresCatalogue }>();
  private readonly demandesMarques = new Subject<{ texte: string; format: string }>();
  private readonly consultations = new Subject<
    | { tri: 'initial'; apres: number; filtres: FiltresCatalogue }
    | { tri: 'nom'; apres: string | null; filtres: FiltresCatalogue }
  >();

  readonly produits = signal<ProduitCatalogue[]>([]);
  readonly prochainId = signal<number | null>(null);
  readonly prochainNom = signal<string | null>(null);
  readonly triCatalogue = signal<'initial' | 'nom'>('initial');
  readonly chargement = signal(false);
  readonly charge = signal(false);
  readonly erreur = signal('');
  readonly imagesIndisponibles = signal<Set<number>>(new Set());
  /** Produit en cours d'ajout à la liste, et message affiché sous sa carte. */
  readonly ajoutEnCours = signal<number | null>(null);
  readonly retourAjout = signal<{ id: number; texte: string; erreur: boolean } | null>(null);
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
  readonly marques = signal<MarqueCatalogue[]>([]);
  readonly chargementMarques = signal(false);
  readonly erreurMarques = signal('');
  readonly saisieTropCourte = computed(() => this.saisie().trim().length > 0 && longueurRecherche(this.saisie()) < 3);
  readonly marqueSelectionneeAbsente = computed(() => {
    const marque = this.filtres().marque;
    return !!marque && !this.marques().some((element) => element.nom.toLowerCase() === marque.toLowerCase());
  });
  readonly filtresActifs = computed(() => !!(this.filtres().marque || this.filtres().format));
  readonly rechercheActive = computed(() => this.saisie().trim().length > 0);
  readonly produitsAffiches = computed(() => this.rechercheActive() ? this.suggestions() : this.produits());

  constructor() {
    this.demandesMarques.pipe(
      switchMap(({ texte, format }) => {
        if (texte.trim() && longueurRecherche(texte) < 3) {
          return EMPTY;
        }
        return timer(250).pipe(
          switchMap(() => this.api.listerMarques(texte, format)),
          map((marques) => ({ marques, erreur: null })),
          catchError((erreur: unknown) => of({ marques: null, erreur })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ marques }) => {
      this.chargementMarques.set(false);
      if (marques !== null) {
        this.marques.set(marques);
      } else {
        this.erreurMarques.set('Impossible de charger les marques. Réessaie.');
      }
    });
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
        this.erreurRecherche.set('Je n’ai pas pu rechercher dans le catalogue. Réessaie.');
        this.erreurSuite.set(curseur !== null);
        return;
      }
      this.suggestions.update((actuelles) => curseur === null ? page.produits : [...actuelles, ...page.produits]);
      this.prochainCurseur.set(page.prochainCurseur);
      this.rechercheEffectuee.set(true);
    });
    this.consultations.pipe(
      switchMap((demande) => {
        const premiere = demande.tri === 'nom' ? demande.apres === null : demande.apres === 0;
        const page$: Observable<{ produits: ProduitCatalogue[]; prochainId: number | null; prochainNom: string | null }> = demande.tri === 'nom'
          ? this.api.consulterParNom(demande.apres, demande.filtres).pipe(
            map((page) => ({ produits: page.produits, prochainId: null, prochainNom: page.prochainCurseur })),
          )
          : this.api.consulter(demande.apres, demande.filtres).pipe(
            map((page) => ({ produits: page.produits, prochainId: page.prochainId, prochainNom: null })),
          );
        return page$.pipe(
          map((page) => ({ page, premiere, erreur: null })),
          catchError((erreur: unknown) => of({ page: null, premiere, erreur })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ page, premiere }) => {
      this.chargement.set(false);
      if (page !== null) {
        this.produits.update((produits) => premiere ? page.produits : [...produits, ...page.produits]);
        this.prochainId.set(page.prochainId);
        this.prochainNom.set(page.prochainNom);
        this.charge.set(true);
      } else {
        this.erreur.set('Je n’ai pas pu charger le catalogue. Réessaie dans un instant.');
      }
    });
  }

  rechercher(texte: string, actualiserFacettes = true): void {
    this.saisie.set(texte);
    this.suggestions.set([]);
    this.erreurRecherche.set('');
    this.rechercheEffectuee.set(false);
    this.prochainCurseur.set(null);
    this.tousResultats.set(false);
    this.erreurSuite.set(false);
    this.rechercheEnCours.set(longueurRecherche(texte) >= 3);
    this.recherches.next({ texte, curseur: null, filtres: this.filtres() });
    if (actualiserFacettes) {
      this.actualiserMarques();
    }
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
    const nouveauFormat = format.trim();
    const formatModifie = nouveauFormat !== this.filtres().format;
    this.filtres.set({ marque: marque.trim(), format: nouveauFormat });
    this.produits.set([]);
    this.prochainId.set(null);
    this.prochainNom.set(null);
    this.charge.set(false);
    this.chargement.set(false);
    this.chargerPremierePage();
    this.rechercher(this.saisie(), formatModifie);
  }

  choisirMarque(marque: string): void {
    this.appliquerFiltres(marque, this.filtres().format);
  }

  actualiserMarques(): void {
    const texte = this.saisie();
    this.marques.set([]);
    this.erreurMarques.set('');
    this.chargementMarques.set(!(texte.trim() && longueurRecherche(texte) < 3));
    this.demandesMarques.next({ texte, format: this.filtres().format });
  }

  reessayerRecherche(): void {
    if (this.erreurSuite()) {
      this.chargerResultats();
    } else {
      this.rechercher(this.saisie());
    }
  }

  illustration(produit: ProduitCatalogue): IllustrationProduit {
    return illustrationProduit(produit.libelle);
  }

  imageEnErreur(id: number): void {
    this.imagesIndisponibles.update((ids) => new Set([...ids, id]));
  }

  /** Ajoute une unité du produit à la liste de l'utilisateur simulé ; un second ajout augmente la quantité. */
  ajouterALaListe(produit: ProduitCatalogue): void {
    if (this.ajoutEnCours() !== null) {
      return;
    }
    if (this.utilisateur.id() === null) {
      this.retourAjout.set({ id: produit.id, erreur: true,
        texte: 'Choisis un utilisateur dans la liste « Utilisateur actuel » pour ajouter ce produit.' });
      return;
    }
    this.envoyerAjout(produit, { type: 'PRODUIT', referenceId: produit.id, quantite: 1, unite: 'ARTICLE' });
  }

  private envoyerAjout(produit: ProduitCatalogue, demande: DemandeAjout): void {
    this.ajoutEnCours.set(produit.id);
    this.retourAjout.set(null);
    this.liste.ajouter(demande).subscribe({
      next: (resultat) => {
        if (resultat.statut === 'CONFIRMATION_REQUISE' && resultat.lignesCandidates.length > 0) {
          // Même produit déjà présent : depuis le catalogue, on ajoute simplement à la ligne existante.
          this.envoyerAjout(produit, { ...demande, decision: 'FUSIONNER', ligneAFusionner: resultat.lignesCandidates[0] });
          return;
        }
        this.ajoutEnCours.set(null);
        const ligne = resultat.lignes.find((l) => l.type === 'PRODUIT' && l.referenceId === produit.id);
        this.retourAjout.set({ id: produit.id, erreur: false, texte: resultat.statut === 'AJOUTEE'
          ? 'Ajouté à ta liste.'
          : `Déjà dans ta liste : quantité portée à ${ligne?.quantite ?? 'plus'}.` });
      },
      error: (erreur: unknown) => {
        this.ajoutEnCours.set(null);
        const detail = erreur instanceof HttpErrorResponse
          ? (erreur.error as { detail?: string } | null)?.detail : undefined;
        this.retourAjout.set({ id: produit.id, erreur: true, texte: detail ?? 'L’ajout n’a pas abouti. Réessaie.' });
      },
    });
  }

  ngOnInit(): void {
    this.chargerPremierePage();
    this.actualiserMarques();
  }

  charger(apres: number): void {
    if (this.chargement()) {
      return;
    }
    this.chargement.set(true);
    this.erreur.set('');
    this.consultations.next({ tri: 'initial', apres, filtres: this.filtres() });
  }

  private chargerParNom(apres: string | null): void {
    if (this.chargement()) {
      return;
    }
    this.chargement.set(true);
    this.erreur.set('');
    this.consultations.next({ tri: 'nom', apres, filtres: this.filtres() });
  }

  private chargerPremierePage(): void {
    if (this.triCatalogue() === 'nom') {
      this.chargerParNom(null);
    } else {
      this.charger(0);
    }
  }

  changerTri(tri: string): void {
    if (tri !== 'nom' && tri !== 'initial') {
      return;
    }
    this.triCatalogue.set(tri);
    this.produits.set([]);
    this.prochainId.set(null);
    this.prochainNom.set(null);
    this.charge.set(false);
    this.chargement.set(false);
    this.chargerPremierePage();
  }

  reessayerCatalogue(): void {
    if (this.triCatalogue() === 'nom') {
      this.chargerParNom(this.produits().length ? this.prochainNom() : null);
    } else {
      this.charger(this.produits().length ? this.prochainId() ?? 0 : 0);
    }
  }

  chargerSuite(): void {
    if (this.triCatalogue() === 'nom') {
      const prochainNom = this.prochainNom();
      if (prochainNom !== null) {
        this.chargerParNom(prochainNom);
      }
      return;
    }
    const prochainId = this.prochainId();
    if (prochainId !== null) {
      this.charger(prochainId);
    }
  }
}
