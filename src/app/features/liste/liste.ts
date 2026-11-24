import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { ProduitTrouve, TypeReference, UniteQuantite } from '../../core/api/produits-api';
import { UtilisateurCourantService } from '../../core/utilisateur/utilisateur-courant.service';
import { RechercheProduit } from '../../shared/recherche-produit/recherche-produit';
import { DemandeAjout, LigneListe, ListeApi, ResultatAjout } from './liste-api';

export const LIBELLES_UNITES: Record<UniteQuantite, string> = {
  ARTICLE: 'article(s)',
  GRAMME: 'g',
  KILOGRAMME: 'kg',
  LITRE: 'L',
  CENTILITRE: 'cl',
};

const TOUTES_UNITES: UniteQuantite[] = ['ARTICLE', 'GRAMME', 'KILOGRAMME', 'LITRE', 'CENTILITRE'];
const FORMAT_NOMBRE = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });

/** Ce que l'utilisateur s'apprête à ajouter : rien n'est ajouté avant qu'il valide lui-même (REQ-049). */
interface Selection {
  type: TypeReference;
  referenceId: number | null;
  libelle: string;
  details: string;
  unites: UniteQuantite[];
}

interface Confirmation {
  demande: DemandeAjout;
  ligne: LigneListe;
}

@Component({
  selector: 'kadi-liste',
  imports: [RouterLink, RechercheProduit],
  templateUrl: './liste.html',
  styleUrl: './liste.css',
})
export class Liste {
  private readonly api = inject(ListeApi);
  private readonly recherche = viewChild(RechercheProduit);

  readonly libellesUnites = LIBELLES_UNITES;
  readonly lignes = signal<LigneListe[]>([]);
  readonly chargement = signal(true);
  private readonly utilisateur = inject(UtilisateurCourantService);
  /** Aucun profil choisi dans la liste déroulante « Utilisateur actuel » : rien à charger. */
  readonly nonConnecte = computed(() => this.utilisateur.id() === null);
  readonly erreurChargement = signal('');
  readonly erreurAction = signal('');
  readonly message = signal('');
  readonly envoi = signal(false);

  readonly selection = signal<Selection | null>(null);
  readonly quantite = signal('1');
  readonly unite = signal<UniteQuantite>('ARTICLE');
  readonly formatSouhaite = signal('');
  readonly confirmation = signal<Confirmation | null>(null);

  readonly edition = signal<string | null>(null);
  readonly quantiteEditee = signal('');

  readonly pasQuantite = computed(() => this.unite() === 'ARTICLE' ? '1' : '0.001');
  readonly formatPossible = computed(() => this.selection()?.type !== 'PRODUIT');

  constructor() {
    // Changer de profil dans la liste déroulante recharge la liste de ce profil.
    effect(() => {
      this.utilisateur.id();
      untracked(() => this.changerDUtilisateur());
    });
  }

  charger(): void {
    if (this.nonConnecte()) {
      this.lignes.set([]);
      this.chargement.set(false);
      return;
    }
    this.chargement.set(true);
    this.erreurChargement.set('');
    this.api.consulter().subscribe({
      next: (liste) => {
        this.lignes.set(liste.lignes);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreurChargement.set('Je n’ai pas pu charger ta liste. Réessaie.');
      },
    });
  }

  private changerDUtilisateur(): void {
    this.selection.set(null);
    this.confirmation.set(null);
    this.edition.set(null);
    this.erreurAction.set('');
    this.message.set('');
    this.charger();
  }

  choisir(produit: ProduitTrouve): void {
    const type = produit.type ?? 'PRODUIT';
    const unites = produit.unites?.length ? produit.unites : ['ARTICLE' as UniteQuantite];
    this.preparer({
      type,
      referenceId: produit.id,
      libelle: produit.libelle,
      details: [produit.marque, produit.quantite].filter(Boolean).join(' · '),
      unites,
    });
  }

  ajouterQuandMeme(saisie: string): void {
    this.preparer({ type: 'BESOIN_PERSONNALISE', referenceId: null, libelle: saisie, details: '', unites: TOUTES_UNITES });
  }

  annulerSelection(): void {
    this.selection.set(null);
    this.erreurAction.set('');
  }

  ajouter(): void {
    const selection = this.selection();
    const quantite = this.lireQuantite(this.quantite(), this.unite());
    if (!selection || quantite === null || this.envoi()) {
      return;
    }
    const libelle = selection.type === 'BESOIN_PERSONNALISE' ? selection.libelle.trim() : null;
    if (selection.type === 'BESOIN_PERSONNALISE' && !libelle) {
      this.erreurAction.set('Donne un nom à ton besoin.');
      return;
    }
    this.envoyerAjout({
      type: selection.type,
      referenceId: selection.referenceId,
      libelle,
      quantite,
      unite: this.unite(),
      formatSouhaite: this.formatPossible() ? this.formatSouhaite().trim() || null : null,
    });
  }

  confirmer(fusionner: boolean): void {
    const confirmation = this.confirmation();
    if (!confirmation) {
      return;
    }
    this.envoyerAjout(fusionner
      ? { ...confirmation.demande, decision: 'FUSIONNER', ligneAFusionner: confirmation.ligne.id }
      : { ...confirmation.demande, decision: 'SEPARER' });
  }

  modifier(ligne: LigneListe): void {
    this.edition.set(ligne.id);
    this.quantiteEditee.set(String(ligne.quantite));
    this.erreurAction.set('');
  }

  enregistrerQuantite(ligne: LigneListe): void {
    const quantite = this.lireQuantite(this.quantiteEditee(), ligne.unite);
    if (quantite === null || this.envoi()) {
      return;
    }
    this.executer(this.api.modifierQuantite(ligne.id, quantite), (liste) => {
      this.lignes.set(liste.lignes);
      this.edition.set(null);
      this.message.set(`Quantité de « ${ligne.libelle} » mise à jour.`);
    });
  }

  supprimer(ligne: LigneListe): void {
    if (this.envoi()) {
      return;
    }
    this.executer(this.api.supprimer(ligne.id), () => {
      this.lignes.update((lignes) => lignes.filter((element) => element.id !== ligne.id));
      this.message.set(`« ${ligne.libelle} » a été retiré de ta liste.`);
    });
  }

  quantiteAffichee(ligne: LigneListe): string {
    const nombre = FORMAT_NOMBRE.format(ligne.quantite);
    return ligne.unite === 'ARTICLE' ? `×${nombre}` : `${nombre} ${LIBELLES_UNITES[ligne.unite]}`;
  }

  libelleType(ligne: LigneListe): string {
    switch (ligne.type) {
      case 'BESOIN_GENERIQUE':
        return 'Référence non précisée';
      case 'BESOIN_PERSONNALISE':
        return ligne.statutBesoin === 'REFUSE' ? 'Besoin personnel' : 'Besoin personnel · en attente de validation';
      default:
        return 'Produit précis';
    }
  }

  private preparer(selection: Selection): void {
    this.selection.set(selection);
    this.unite.set(selection.unites[0]);
    this.quantite.set('1');
    this.formatSouhaite.set('');
    this.confirmation.set(null);
    this.erreurAction.set('');
    this.message.set('');
  }

  private envoyerAjout(demande: DemandeAjout): void {
    this.executer(this.api.ajouter(demande), (resultat: ResultatAjout) => {
      this.lignes.set(resultat.lignes);
      if (resultat.statut === 'CONFIRMATION_REQUISE') {
        const ligne = resultat.lignes.find((element) => element.id === resultat.lignesCandidates[0]);
        if (ligne) {
          this.confirmation.set({ demande, ligne });
          return;
        }
      }
      const libelle = this.selection()?.libelle ?? '';
      this.message.set(resultat.statut === 'FUSIONNEE'
        ? `Quantité ajoutée à la ligne « ${libelle} » existante.`
        : `« ${libelle} » a été ajouté à ta liste.`);
      this.selection.set(null);
      this.confirmation.set(null);
      this.recherche()?.vider();
    });
  }

  private executer<T>(requete: Observable<T>, succes: (valeur: T) => void): void {
    this.envoi.set(true);
    this.erreurAction.set('');
    this.message.set('');
    requete.subscribe({
      next: (valeur) => {
        this.envoi.set(false);
        succes(valeur);
      },
      error: (erreur: unknown) => {
        this.envoi.set(false);
        if (!this.nonConnecte()) {
          this.erreurAction.set(this.lireErreur(erreur));
        }
      },
    });
  }

  private lireQuantite(texte: string, unite: UniteQuantite): number | null {
    const valeur = Number(String(texte).replace(',', '.'));
    if (!Number.isFinite(valeur) || valeur <= 0) {
      this.erreurAction.set('La quantité doit être un nombre strictement positif.');
      return null;
    }
    if (unite === 'ARTICLE' && !Number.isInteger(valeur)) {
      this.erreurAction.set('Un nombre d’articles doit être entier.');
      return null;
    }
    return valeur;
  }

  private lireErreur(erreur: unknown): string {
    if (erreur instanceof HttpErrorResponse) {
      if (erreur.status === 403) {
        return 'Ce profil n’a pas le droit de faire cette action. Choisis un autre utilisateur.';
      }
      const detail = (erreur.error as { detail?: string } | null)?.detail;
      if (detail) {
        return detail;
      }
    }
    return 'L’opération n’a pas abouti. Réessaie.';
  }
}
