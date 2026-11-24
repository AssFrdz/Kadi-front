import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MagasinsApi, MagasinTrouve } from '../../core/api/magasins-api';
import { PrixApi, PrixDeReference } from '../../core/api/prix-api';
import { ProduitsApi, ProduitTrouve } from '../../core/api/produits-api';
import { ChampDeRecherche } from '../../shared/champ-de-recherche/champ-de-recherche';
import { BadgeConfiance } from '../../shared/prix/badge-confiance';
import { DetailReleves } from '../../shared/prix/detail-releves';
import { prixEnEuros } from '../../shared/prix/libelles';

/** Ce que l'écran montre sous les deux champs. */
type Etat =
  | { nom: 'attente' }
  | { nom: 'chargement' }
  | { nom: 'trouve'; prix: PrixDeReference }
  | { nom: 'aucun' }
  | { nom: 'erreur'; message: string };

/**
 * F2 : « Prix d'un produit ». On choisit un produit et un magasin, et Kadi affiche le prix de référence,
 * sa confiance et le détail des relevés ; ou dit honnêtement qu'il n'a pas encore de prix.
 */
@Component({
  selector: 'app-prix',
  imports: [ChampDeRecherche, BadgeConfiance, DetailReleves, RouterLink],
  template: `
    <h1>Prix d'un produit</h1>
    <p><a routerLink="/prix/ajouter">+ Ajouter un prix</a></p>

    <div class="choix">
      <app-champ-de-recherche
        etiquette="Produit"
        indication="Nom ou code-barres (ex. lait demi)"
        [chercher]="rechercherProduits"
        [libelle]="afficherProduit"
        (choisi)="choisirProduit($event)"
      />
      <app-champ-de-recherche
        etiquette="Magasin"
        indication="Nom ou enseigne (ex. leclerc clichy)"
        [chercher]="rechercherMagasins"
        [libelle]="afficherMagasin"
        (choisi)="choisirMagasin($event)"
      />
    </div>

    <section class="resultat" aria-live="polite">
      @switch (etat().nom) {
        @case ('attente') {
          <p class="aide">Choisissez un produit et un magasin.</p>
        }
        @case ('chargement') {
          <p class="aide">Calcul du prix…</p>
        }
        @case ('trouve') {
          @if (prixTrouve(); as prix) {
            <p class="prix">{{ euros(prix) }}</p>
            <app-badge-confiance [prix]="prix" />
            <app-detail-releves [prix]="prix" />
          }
        }
        @case ('aucun') {
          <p>Pas encore de prix connu ici.</p>
        }
        @case ('erreur') {
          <p class="erreur">{{ messageErreur() }}</p>
        }
      }
    </section>
  `,
  styles: `
    .choix { display: grid; gap: 12px; max-width: 480px; }
    .resultat { margin-top: 20px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
    .prix { font-size: 2rem; font-weight: 700; margin: 0; }
    .aide { color: #666; }
    .erreur { color: #8a1c1c; }
  `,
})
export class PrixPage {
  private readonly prixApi = inject(PrixApi);
  private readonly produitsApi = inject(ProduitsApi);
  private readonly magasinsApi = inject(MagasinsApi);

  protected readonly etat = signal<Etat>({ nom: 'attente' });
  private produit: ProduitTrouve | null = null;
  private magasin: MagasinTrouve | null = null;

  // ce que le champ de recherche doit savoir faire pour chaque sorte d'élément
  protected readonly rechercherProduits = (texte: string) => this.produitsApi.rechercher(texte);
  protected readonly afficherProduit = (produit: ProduitTrouve) => produit.libelle;
  protected readonly rechercherMagasins = (texte: string) => this.magasinsApi.rechercher(texte);
  protected readonly afficherMagasin = (magasin: MagasinTrouve) => `${magasin.nom} · ${magasin.enseigne}`;

  protected choisirProduit(produit: ProduitTrouve): void {
    this.produit = produit;
    this.chargerSiPret();
  }

  protected choisirMagasin(magasin: MagasinTrouve): void {
    this.magasin = magasin;
    this.chargerSiPret();
  }

  protected prixTrouve(): PrixDeReference | null {
    const etat = this.etat();
    return etat.nom === 'trouve' ? etat.prix : null;
  }

  protected messageErreur(): string {
    const etat = this.etat();
    return etat.nom === 'erreur' ? etat.message : '';
  }

  protected euros(prix: PrixDeReference): string {
    return prixEnEuros(prix.prix, prix.unite);
  }

  /** Le prix n'a de sens qu'avec les deux : on n'appelle l'API qu'une fois le produit ET le magasin choisis. */
  private chargerSiPret(): void {
    if (!this.produit || !this.magasin) {
      return;
    }
    this.etat.set({ nom: 'chargement' });
    this.prixApi.prixDeReference(this.produit.id, this.magasin.id).subscribe({
      next: (prix) => this.etat.set({ nom: 'trouve', prix }),
      error: (erreur: HttpErrorResponse) => this.etat.set(PrixPage.etatDErreur(erreur)),
    });
  }

  /** Un 404 « Pas encore de prix connu » n'est pas une panne : c'est une réponse honnête du back. */
  private static etatDErreur(erreur: HttpErrorResponse): Etat {
    if (erreur.status === 404 && erreur.error?.title === 'Pas encore de prix connu') {
      return { nom: 'aucun' };
    }
    if (erreur.status === 0) {
      return { nom: 'erreur', message: 'Le serveur de Kadi ne répond pas.' };
    }
    return { nom: 'erreur', message: erreur.error?.detail ?? 'Une erreur est survenue.' };
  }
}
