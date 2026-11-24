import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SelecteurUtilisateur } from './shared/selecteur-utilisateur/selecteur-utilisateur';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SelecteurUtilisateur],
  template: '<kadi-selecteur-utilisateur /><router-outlet />',
})
export class App {}
