import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { UtilisateurCourantService } from '../../core/utilisateur/utilisateur-courant.service';
import { BesoinGenerique, ModerationApi, NatureBesoin, Proposition, StatutProposition } from './moderation-api';

export const ONGLETS: { statut: StatutProposition; libelle: string }[] = [
  { statut: 'EN_ATTENTE', libelle: 'En attente' },
  { statut: 'VALIDE', libelle: 'Acceptés' },
  { statut: 'REFUSE', libelle: 'Refusés' },
];

export const NATURES: { valeur: NatureBesoin; libelle: string }[] = [
  { valeur: 'SOLIDE', libelle: 'Solide (articles, g, kg)' },
  { valeur: 'LIQUIDE', libelle: 'Liquide (articles, L, cl)' },
  { valeur: 'UNITAIRE', libelle: 'À l’unité (articles)' },
];

/**
 * Espace administrateur : accepter (avec correction ou rattachement à un besoin existant) ou refuser
 * les besoins personnels que les utilisateurs proposent au catalogue commun.
 */
@Component({
  selector: 'kadi-moderation',
  imports: [RouterLink],
  templateUrl: './moderation.html',
  styleUrl: './moderation.css',
})
export class Moderation {
  private readonly api = inject(ModerationApi);
  private readonly utilisateur = inject(UtilisateurCourantService);

  readonly onglets = ONGLETS;
  readonly natures = NATURES;
  readonly estAdministrateur = computed(() => this.utilisateur.courant()?.role === 'ADMINISTRATEUR');
  readonly statut = signal<StatutProposition>('EN_ATTENTE');
  readonly propositions = signal<Proposition[]>([]);
  readonly generiques = signal<BesoinGenerique[]>([]);
  readonly chargement = signal(false);
  readonly erreur = signal('');
  readonly message = signal('');
  readonly enCours = signal<number | null>(null);

  constructor() {
    effect(() => {
      const administrateur = this.estAdministrateur();
      untracked(() => {
        this.message.set('');
        if (administrateur) {
          this.charger();
        } else {
          this.propositions.set([]);
        }
      });
    });
  }

  choisirOnglet(statut: StatutProposition): void {
    this.statut.set(statut);
    this.message.set('');
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.erreur.set('');
    this.api.lister(this.statut()).subscribe({
      next: (propositions) => {
        this.propositions.set(propositions);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        this.chargement.set(false);
        this.erreur.set(lireErreur(erreur, 'Je n’ai pas pu charger les propositions. Réessaie.'));
      },
    });
    if (this.statut() === 'EN_ATTENTE') {
      this.api.besoinsGeneriques().subscribe({ next: (besoins) => this.generiques.set(besoins), error: () => {} });
    }
  }

  /** `rattachement` : id d'un besoin générique existant, ou chaîne vide pour publier un nouveau besoin. */
  accepter(proposition: Proposition, libelle: string, nature: string, rattachement: string): void {
    const besoinExistantId = rattachement ? Number(rattachement) : null;
    this.traiter(proposition, this.api.valider(proposition.id, {
      libelle: libelle.trim() || null,
      nature: besoinExistantId ? null : (nature as NatureBesoin) || null,
      besoinExistantId,
    }), (validation) => validation.rattache
      ? `« ${proposition.libelle} » est rattaché au besoin existant « ${validation.libelle} ».`
      : `« ${validation.libelle} » est maintenant proposé à tous les utilisateurs.`);
  }

  refuser(proposition: Proposition): void {
    this.traiter(proposition, this.api.refuser(proposition.id),
      () => `« ${proposition.libelle} » est refusé : il reste privé, dans la liste de ${proposition.auteur}.`);
  }

  dateCourte(iso: string | null): string {
    return iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '';
  }

  private traiter<T>(proposition: Proposition, requete: Observable<T>, succes: (valeur: T) => string): void {
    if (this.enCours() !== null) {
      return;
    }
    this.enCours.set(proposition.id);
    this.erreur.set('');
    this.message.set('');
    requete.subscribe({
      next: (valeur) => {
        this.enCours.set(null);
        this.propositions.update((liste) => liste.filter((p) => p.id !== proposition.id));
        this.message.set(succes(valeur));
        this.api.besoinsGeneriques().subscribe({ next: (besoins) => this.generiques.set(besoins), error: () => {} });
      },
      error: (erreur: unknown) => {
        this.enCours.set(null);
        this.erreur.set(lireErreur(erreur, 'L’action n’a pas abouti. Réessaie.'));
        if (erreur instanceof HttpErrorResponse && erreur.status === 409) {
          this.charger();
        }
      },
    });
  }
}

function lireErreur(erreur: unknown, parDefaut: string): string {
  if (erreur instanceof HttpErrorResponse) {
    return (erreur.error as { detail?: string } | null)?.detail ?? parDefaut;
  }
  return parDefaut;
}
