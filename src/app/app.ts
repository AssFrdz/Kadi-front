import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { InfoApi } from './core/api/info-api';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly infoApi = inject(InfoApi);

  protected readonly etatApi = signal('API : connexion…');

  ngOnInit(): void {
    this.infoApi.lire().subscribe({
      next: (info) => this.etatApi.set(`API ${info.version}`),
      error: () => this.etatApi.set('API injoignable'),
    });
  }
}
