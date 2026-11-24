import { Component, OnInit, inject } from '@angular/core';
import { RoleUtilisateur, UtilisateurCourantService } from '../../core/utilisateur/utilisateur-courant.service';

const LIBELLES_ROLES: Record<RoleUtilisateur, string> = {
  UTILISATEUR: 'consommateur',
  ADMINISTRATEUR: 'administrateur',
};

/** Liste déroulante « Utilisateur actuel » : simule la connexion en choisissant un profil. */
@Component({
  selector: 'kadi-selecteur-utilisateur',
  templateUrl: './selecteur-utilisateur.html',
  styleUrl: './selecteur-utilisateur.css',
})
export class SelecteurUtilisateur implements OnInit {
  readonly service = inject(UtilisateurCourantService);
  readonly libellesRoles = LIBELLES_ROLES;

  ngOnInit(): void {
    this.service.charger();
  }

  changer(valeur: string): void {
    this.service.choisir(valeur ? Number(valeur) : null);
  }
}
