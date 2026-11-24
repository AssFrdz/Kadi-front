import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, map, of, switchMap, timer } from 'rxjs';
import { LONGUEUR_MINIMALE_RECHERCHE, PorteeRecherche, ProduitTrouve, ProduitsApi } from '../../core/api/produits-api';

/** Délai après la dernière touche avant d'interroger l'API. */
export const DELAI_RECHERCHE_MS = 300;

let compteur = 0;

/**
 * Champ de recherche de produit partagé (F1 « Ma liste », F2 « Prix d'un produit » et « Ajouter un prix »).
 * Il n'ajoute jamais rien de lui-même : il émet `produitChoisi` uniquement quand l'utilisateur sélectionne une suggestion.
 * Un code-barres tapé à la main (6 à 14 chiffres) est recherché exactement par le back.
 */
@Component({
  selector: 'kadi-recherche-produit',
  imports: [],
  templateUrl: './recherche-produit.html',
  styleUrl: './recherche-produit.css',
})
export class RechercheProduit {
  private readonly api = inject(ProduitsApi);
  private readonly saisies = new Subject<string>();
  private fermeture?: ReturnType<typeof setTimeout>;

  readonly libelle = input('Rechercher un produit');
  readonly placeholder = input('Nom, marque ou code-barres');
  /** Sans portée : produits précis (F2). `liste` : besoins génériques et personnels en plus (F1). */
  readonly portee = input<PorteeRecherche>(null);
  /** Caractères à saisir avant d'interroger l'API (2 pour F2 ; « Ma liste » en demande 3, REQ-007). */
  readonly longueurMinimale = input(LONGUEUR_MINIMALE_RECHERCHE);
  /** Suggestions affichées au plus (20 par défaut ; « Ma liste » en affiche 7, REQ-070). */
  readonly nombreMaximal = input(20);
  readonly produitChoisi = output<ProduitTrouve>();
  /** Émis quand l'utilisateur choisit « + L'ajouter quand même » (portée `liste` uniquement), avec sa saisie. */
  readonly ajouterQuandMeme = output<string>();

  readonly identifiant = `recherche-produit-${++compteur}`;
  readonly saisie = signal('');
  readonly resultats = signal<ProduitTrouve[]>([]);
  readonly chargement = signal(false);
  readonly erreur = signal(false);
  readonly nonConnecte = signal(false);
  readonly rechercheEffectuee = signal(false);
  readonly ouvert = signal(false);
  readonly actif = signal(-1);

  readonly saisieSuffisante = computed(() => this.saisie().trim().length >= this.longueurMinimale());
  readonly suggestions = computed(() => this.resultats().slice(0, this.nombreMaximal()));
  readonly listeVisible = computed(() => this.ouvert() && this.saisieSuffisante()
    && (this.chargement() || this.erreur() || this.nonConnecte() || this.rechercheEffectuee()));
  readonly idActif = computed(() => this.actif() >= 0 ? `${this.identifiant}-option-${this.actif()}` : null);
  readonly proposerAjoutLibre = computed(() => this.portee() === 'liste' && this.saisieSuffisante()
    && !this.chargement() && !this.erreur() && !this.nonConnecte() && this.rechercheEffectuee());

  constructor() {
    this.saisies.pipe(
      switchMap((texte) => {
        if (texte.trim().length < this.longueurMinimale()) {
          return EMPTY;
        }
        // switchMap annule la requête précédente : une réponse tardive ne remplace jamais la saisie actuelle.
        return timer(DELAI_RECHERCHE_MS).pipe(
          switchMap(() => this.api.rechercher(texte.trim(), this.portee())),
          map((produits) => ({ produits, erreur: null as unknown })),
          catchError((erreur: unknown) => of({ produits: null, erreur })),
        );
      }),
      takeUntilDestroyed(inject(DestroyRef)),
    ).subscribe(({ produits, erreur }) => {
      this.chargement.set(false);
      if (produits !== null) {
        this.resultats.set(produits);
        this.rechercheEffectuee.set(true);
      } else if (erreur instanceof HttpErrorResponse && erreur.status === 400
          && String((erreur.error as { detail?: string } | null)?.detail ?? "").includes("X-Utilisateur-Id")) {
        this.nonConnecte.set(true);
      } else {
        this.erreur.set(true);
      }
    });
  }

  saisir(texte: string): void {
    this.saisie.set(texte);
    this.resultats.set([]);
    this.actif.set(-1);
    this.erreur.set(false);
    this.nonConnecte.set(false);
    this.rechercheEffectuee.set(false);
    this.ouvrir();
    this.chargement.set(texte.trim().length >= this.longueurMinimale());
    this.saisies.next(texte);
  }

  reessayer(): void {
    this.saisir(this.saisie());
  }

  choisir(produit: ProduitTrouve): void {
    this.produitChoisi.emit(produit);
    this.saisie.set(produit.libelle);
    this.ouvert.set(false);
    this.actif.set(-1);
  }

  ajouterLibrement(): void {
    this.ajouterQuandMeme.emit(this.saisie().trim());
    this.ouvert.set(false);
    this.actif.set(-1);
  }

  /** Vide le champ, par exemple après l'ajout du produit choisi. */
  vider(): void {
    this.saisie.set('');
    this.resultats.set([]);
    this.rechercheEffectuee.set(false);
    this.ouvert.set(false);
    this.actif.set(-1);
  }

  clavier(evenement: KeyboardEvent): void {
    const nombre = this.suggestions().length;
    switch (evenement.key) {
      case 'ArrowDown':
        evenement.preventDefault();
        this.ouvert.set(true);
        if (nombre > 0) {
          this.actif.set((this.actif() + 1) % nombre);
        }
        break;
      case 'ArrowUp':
        evenement.preventDefault();
        if (nombre > 0) {
          this.actif.set(this.actif() <= 0 ? nombre - 1 : this.actif() - 1);
        }
        break;
      case 'Enter':
        if (this.listeVisible() && this.actif() >= 0 && this.actif() < nombre) {
          evenement.preventDefault();
          this.choisir(this.suggestions()[this.actif()]);
        }
        break;
      case 'Escape':
        this.ouvert.set(false);
        this.actif.set(-1);
        break;
    }
  }

  ouvrir(): void {
    this.annulerFermeture();
    this.ouvert.set(true);
  }

  fermerPlusTard(): void {
    // Laisse le clic sur une suggestion aboutir avant de fermer la liste.
    this.annulerFermeture();
    this.fermeture = setTimeout(() => {
      this.fermeture = undefined;
      this.ouvert.set(false);
    }, 150);
  }

  /** Une frappe ou un retour dans le champ annule une fermeture encore en attente. */
  private annulerFermeture(): void {
    if (this.fermeture !== undefined) {
      clearTimeout(this.fermeture);
      this.fermeture = undefined;
    }
  }
}
