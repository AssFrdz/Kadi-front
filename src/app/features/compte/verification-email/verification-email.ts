import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CompteApi } from '../compte-api';

type EtatVerification = 'chargement' | 'confirme' | 'erreur';

@Component({
  selector: 'kadi-verification-email',
  imports: [RouterLink],
  templateUrl: './verification-email.html',
  styleUrl: './verification-email.css',
})
export class VerificationEmail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly compteApi = inject(CompteApi);

  readonly etat = signal<EtatVerification>('chargement');
  readonly messageErreur = signal('');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.etat.set('erreur');
      this.messageErreur.set('Le lien est incomplet. Demande un nouveau lien de vérification.');
      return;
    }

    this.compteApi.confirmerEmail(token).subscribe({
      next: () => this.etat.set('confirme'),
      error: (erreur: unknown) => {
        this.messageErreur.set(
          this.compteApi.lireErreur(
            erreur,
            erreur instanceof HttpErrorResponse
              ? 'Ce lien ne fonctionne plus. Demande un nouveau lien de vérification.'
              : 'Je n’ai pas pu vérifier ton adresse.',
          ),
        );
        this.etat.set('erreur');
      },
    });
  }
}
