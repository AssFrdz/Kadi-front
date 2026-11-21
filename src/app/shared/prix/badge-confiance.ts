import { Component, computed, input } from '@angular/core';
import { PrixDeReference } from '../../core/api/prix-api';
import { NIVEAUX } from './libelles';

/**
 * Le badge qui accompagne chaque prix : « ●●○ Confiance moyenne ».
 * Réutilisable par les autres écrans (la fiche produit de F3, par exemple) : il suffit de lui passer le prix de référence.
 */
@Component({
  selector: 'app-badge-confiance',
  template: `
    <span class="badge" [class]="niveau().toLowerCase()" [title]="'Score ' + score()">
      <span class="points" aria-hidden="true">{{ points() }}</span>
      {{ texte() }}
    </span>
    @if (prix().niveauDeCalcul === 'ENSEIGNE') {
      <small class="repli">Estimé d'après les autres magasins de l'enseigne</small>
    }
  `,
  styles: `
    :host { display: inline-flex; flex-direction: column; gap: 2px; }
    .badge { display: inline-flex; gap: 6px; align-items: center; padding: 2px 8px; border-radius: 12px; font-size: 0.9rem; }
    .elevee { background: #e3f4e4; color: #1d5e22; }
    .moyenne { background: #fbf0d9; color: #6b4a00; }
    .faible { background: #fbe4e4; color: #8a1c1c; }
    .points { letter-spacing: 1px; }
    .repli { color: #666; }
  `,
})
export class BadgeConfiance {
  readonly prix = input.required<PrixDeReference>();

  protected readonly niveau = computed(() => this.prix().confiance.niveau);
  protected readonly texte = computed(() => NIVEAUX[this.niveau()].texte);
  protected readonly score = computed(() => this.prix().confiance.score.toFixed(2));
  /** 3 points, dont autant de pleins que le niveau : ●●● élevée, ●●○ moyenne, ●○○ faible. */
  protected readonly points = computed(() => {
    const pleins = NIVEAUX[this.niveau()].points;
    return '●'.repeat(pleins) + '○'.repeat(3 - pleins);
  });
}
