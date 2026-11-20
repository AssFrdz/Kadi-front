import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CompteApi } from '../compte-api';

@Component({
  selector: 'kadi-inscription',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './inscription.html',
  styleUrl: './inscription.css',
})
export class Inscription {
  private readonly compteApi = inject(CompteApi);

  readonly envoiEnCours = signal(false);
  readonly erreur = signal('');
  readonly emailEnvoye = signal('');
  readonly formulaire = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(320)],
    }),
    motDePasse: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(12)],
    }),
  });

  inscrire(): void {
    if (this.formulaire.invalid || this.envoiEnCours()) {
      this.formulaire.markAllAsTouched();
      return;
    }

    this.erreur.set('');
    this.envoiEnCours.set(true);
    const { email, motDePasse } = this.formulaire.getRawValue();

    this.compteApi.inscrire(email, motDePasse).subscribe({
      next: (reponse) => {
        this.emailEnvoye.set(reponse.email);
        this.envoiEnCours.set(false);
      },
      error: (erreur: unknown) => {
        this.erreur.set(
          this.compteApi.lireErreur(
            erreur,
            erreur instanceof HttpErrorResponse
              ? 'Je n’ai pas pu créer ton compte. Réessaie dans un instant.'
              : 'Je n’ai pas pu créer ton compte.',
          ),
        );
        this.envoiEnCours.set(false);
      },
    });
  }
}
