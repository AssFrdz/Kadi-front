import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MagasinsApi, MagasinTrouve } from '../../core/api/magasins-api';
import { ControleDeSaisie, PrixApi, SaisieReleve, TypeDePreuve } from '../../core/api/prix-api';
import { ProduitsApi, ProduitTrouve } from '../../core/api/produits-api';
import { ChampDeRecherche } from '../../shared/champ-de-recherche/champ-de-recherche';
import { prixEnEuros } from '../../shared/prix/libelles';
import { contributeurAnonyme } from './contributeur';

/** Ce que l'écran montre après l'envoi. */
type Etat =
  | { nom: 'saisie' }
  | { nom: 'envoi' }
  | { nom: 'enregistre'; controle: ControleDeSaisie }
  | { nom: 'inhabituel'; controle: ControleDeSaisie }
  | { nom: 'erreur'; message: string };

/**
 * F2 : « Ajouter un prix ». Le back contrôle la saisie : un prix proche des relevés connus est enregistré,
 * un prix inhabituel (422) n'est enregistré qu'après confirmation (scénario de Karim, dossier section 03).
 */
@Component({
  selector: 'app-ajouter-prix',
  imports: [ChampDeRecherche, RouterLink],
  template: `
    <h1>Ajouter un prix</h1>
    <p><a routerLink="/prix">← Voir le prix d'un produit</a></p>

    <form class="formulaire" (submit)="$event.preventDefault(); envoyer(false)">
      <app-champ-de-recherche
        etiquette="Produit"
        indication="Nom ou code-barres"
        [chercher]="rechercherProduits"
        [libelle]="afficherProduit"
        (choisi)="produit.set($event)"
      />
      <app-champ-de-recherche
        etiquette="Magasin"
        indication="Nom ou enseigne"
        [chercher]="rechercherMagasins"
        [libelle]="afficherMagasin"
        (choisi)="magasin.set($event)"
      />

      <label>
        Prix en euros
        <input #champPrix type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="1,09"
               [value]="prix() ?? ''" (input)="lirePrix($any($event.target).value)" />
      </label>

      <label>
        Preuve
        <select (change)="preuve.set($any($event.target).value)">
          <option value="ETIQUETTE">Photo d'étiquette</option>
          <option value="TICKET">Ticket de caisse</option>
          <option value="SAISIE" selected>Aucune, je l'ai lu en rayon</option>
        </select>
      </label>

      <label class="case">
        <input type="checkbox" (change)="enPromotion.set($any($event.target).checked)" />
        C'est un prix en promotion
      </label>

      <button type="submit" [disabled]="!pret() || etat().nom === 'envoi'">Enregistrer</button>
    </form>

    <section aria-live="polite">
      @switch (etat().nom) {
        @case ('envoi') {
          <p class="aide">Vérification du prix…</p>
        }
        @case ('enregistre') {
          <p class="succes">{{ messageEnregistre() }}</p>
        }
        @case ('inhabituel') {
          <div class="alerte" role="alertdialog" aria-labelledby="titre-alerte">
            <h2 id="titre-alerte">Ce prix semble inhabituel</h2>
            <p>
              Vous avez saisi <strong>{{ euros(prix()) }}</strong>. Ce produit est relevé autour de
              <strong>{{ euros(controleAffiche()?.reference) }}</strong> ici
              ({{ ecart() }}).
            </p>
            <p>Vérifiez l'étiquette.</p>
            <div class="boutons">
              <button type="button" (click)="corriger(champPrix)">Corriger</button>
              <button type="button" (click)="envoyer(true)">Confirmer quand même</button>
            </div>
          </div>
        }
        @case ('erreur') {
          <p class="erreur">{{ messageErreur() }}</p>
        }
      }
    </section>
  `,
  styles: `
    .formulaire { display: grid; gap: 12px; max-width: 480px; }
    label { display: flex; flex-direction: column; gap: 4px; }
    .case { flex-direction: row; align-items: center; gap: 8px; }
    input[type=number], select { padding: 8px; font-size: 1rem; }
    button { padding: 10px; font-size: 1rem; cursor: pointer; }
    .aide { color: #666; }
    .succes { color: #1d5e22; font-weight: 600; }
    .erreur { color: #8a1c1c; }
    .alerte { max-width: 480px; margin-top: 16px; padding: 12px 16px; border: 2px solid #c58a00; background: #fff8e6; }
    .alerte h2 { margin: 0 0 8px; font-size: 1.1rem; }
    .boutons { display: flex; gap: 8px; }
  `,
})
export class AjouterPrixPage {
  private readonly prixApi = inject(PrixApi);
  private readonly produitsApi = inject(ProduitsApi);
  private readonly magasinsApi = inject(MagasinsApi);

  protected readonly produit = signal<ProduitTrouve | null>(null);
  protected readonly magasin = signal<MagasinTrouve | null>(null);
  protected readonly prix = signal<number | null>(null);
  protected readonly preuve = signal<TypeDePreuve>('SAISIE');
  protected readonly enPromotion = signal(false);
  protected readonly etat = signal<Etat>({ nom: 'saisie' });

  protected readonly pret = computed(() => !!this.produit() && !!this.magasin() && (this.prix() ?? 0) > 0);

  protected readonly rechercherProduits = (texte: string) => this.produitsApi.rechercher(texte);
  protected readonly afficherProduit = (produit: ProduitTrouve) => produit.libelle;
  protected readonly rechercherMagasins = (texte: string) => this.magasinsApi.rechercher(texte);
  protected readonly afficherMagasin = (magasin: MagasinTrouve) => `${magasin.nom} · ${magasin.enseigne}`;

  protected lirePrix(texte: string): void {
    const valeur = Number.parseFloat(texte.replace(',', '.'));
    this.prix.set(Number.isFinite(valeur) ? Math.round(valeur * 100) / 100 : null);
    // modifier le prix efface l'alerte ou le message précédents
    this.etat.set({ nom: 'saisie' });
  }

  /** Premier envoi : confirmer = false. Après l'alerte, « Confirmer quand même » renvoie la même saisie avec confirmer = true. */
  protected envoyer(confirmer: boolean): void {
    const produit = this.produit();
    const magasin = this.magasin();
    const prix = this.prix();
    if (!produit || !magasin || prix === null || prix <= 0) {
      return;
    }
    const saisie: SaisieReleve = {
      produitId: produit.id,
      magasinId: magasin.id,
      prix,
      preuve: this.preuve(),
      enPromotion: this.enPromotion(),
      contributeur: contributeurAnonyme(),
      confirmerMalgreAlerte: confirmer,
    };
    this.etat.set({ nom: 'envoi' });
    this.prixApi.saisir(saisie).subscribe({
      next: (reponse) => this.etat.set({ nom: 'enregistre', controle: reponse.controle }),
      error: (erreur: HttpErrorResponse) => this.etat.set(AjouterPrixPage.etatDErreur(erreur)),
    });
  }

  protected corriger(champPrix: HTMLInputElement): void {
    this.etat.set({ nom: 'saisie' });
    champPrix.focus();
    champPrix.select();
  }

  protected controleAffiche(): ControleDeSaisie | null {
    const etat = this.etat();
    return etat.nom === 'enregistre' || etat.nom === 'inhabituel' ? etat.controle : null;
  }

  protected messageEnregistre(): string {
    return this.controleAffiche()?.statut === 'SANS_REFERENCE'
      ? "Merci, prix enregistré. C'est l'un des premiers prix connus pour ce produit ici."
      : 'Merci, prix enregistré.';
  }

  protected ecart(): string {
    const ecart = this.controleAffiche()?.ecartPourcent ?? 0;
    return `${ecart > 0 ? '+' : '−'}${Math.abs(Math.round(ecart))} %`;
  }

  protected messageErreur(): string {
    const etat = this.etat();
    return etat.nom === 'erreur' ? etat.message : '';
  }

  protected euros(valeur: number | null | undefined): string {
    return valeur === null || valeur === undefined ? '' : prixEnEuros(valeur);
  }

  private static etatDErreur(erreur: HttpErrorResponse): Etat {
    if (erreur.status === 422 && erreur.error?.controle) {
      return { nom: 'inhabituel', controle: erreur.error.controle };
    }
    if (erreur.status === 0) {
      return { nom: 'erreur', message: 'Le serveur de Kadi ne répond pas. Réessayez dans un instant.' };
    }
    return { nom: 'erreur', message: erreur.error?.detail ?? 'Le prix n\'a pas pu être enregistré.' };
  }
}
