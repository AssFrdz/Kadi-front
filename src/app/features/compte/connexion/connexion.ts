import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CompteApi, CompteSession } from '../compte-api';

@Component({
  selector: 'kadi-connexion',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './connexion.html',
  styleUrl: './connexion.css',
})
export class Connexion implements OnInit {
  private readonly compteApi = inject(CompteApi);

  readonly chargementSession = signal(true);
  readonly envoiEnCours = signal(false);
  readonly erreur = signal('');
  readonly session = signal<CompteSession | null>(null);
  readonly formulaire = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(320)],
    }),
    motDePasse: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  ngOnInit(): void {
    this.compteApi.lireSession().subscribe({
      next: (session) => {
        this.session.set(session);
        this.chargementSession.set(false);
      },
      error: (erreur: unknown) => {
        this.chargementSession.set(false);
        if (!(erreur instanceof HttpErrorResponse && erreur.status === 401)) {
          this.erreur.set(
            this.compteApi.lireErreur(erreur, 'Je n’ai pas pu vérifier ta session. Réessaie.'),
          );
        }
      },
    });
  }

  connecter(): void {
    if (this.formulaire.invalid || this.envoiEnCours()) {
      this.formulaire.markAllAsTouched();
      return;
    }

    this.erreur.set('');
    this.envoiEnCours.set(true);
    const { email, motDePasse } = this.formulaire.getRawValue();

    this.compteApi.connecter(email, motDePasse).subscribe({
      next: (session) => {
        this.session.set(session);
        this.envoiEnCours.set(false);
      },
      error: (erreur: unknown) => {
        this.erreur.set(
          this.compteApi.lireErreur(
            erreur,
            'Je n’ai pas pu t’identifier. Vérifie ton adresse et ton mot de passe.',
          ),
        );
        this.envoiEnCours.set(false);
      },
    });
  }

  deconnecter(): void {
    if (this.envoiEnCours()) {
      return;
    }

    this.erreur.set('');
    this.envoiEnCours.set(true);
    this.compteApi.deconnecter().subscribe({
      next: () => {
        this.session.set(null);
        this.formulaire.reset();
        this.envoiEnCours.set(false);
      },
      error: (erreur: unknown) => {
        this.erreur.set(
          this.compteApi.lireErreur(erreur, 'Je n’ai pas pu fermer ta session. Réessaie.'),
        );
        this.envoiEnCours.set(false);
      },
    });
  }
}
