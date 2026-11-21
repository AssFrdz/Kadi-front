import { Component, input } from '@angular/core';
import { PrixDeReference } from '../../core/api/prix-api';
import { ilYA, MOTIFS, PREUVES, prixEnEuros } from './libelles';

/**
 * Le détail d'un prix de référence : les relevés retenus, puis les écartés avec leur motif.
 * C'est la « raison d'y croire » promise par F2 : l'utilisateur voit d'où vient le prix.
 */
@Component({
  selector: 'app-detail-releves',
  template: `
    <details>
      <summary>
        {{ prix().retenus.length }} relevé(s) retenu(s)
        @if (prix().ecartes.length > 0) {
          · {{ prix().ecartes.length }} écarté(s)
        }
      </summary>

      <h4>Retenus</h4>
      <ul>
        @for (releve of prix().retenus; track releve.id) {
          <li>
            <strong>{{ euros(releve.prix) }}</strong>
            · {{ depuis(releve.releveLe) }} · {{ preuves[releve.preuve] }}
          </li>
        }
      </ul>

      @if (prix().ecartes.length > 0) {
        <h4>Écartés</h4>
        <ul class="ecartes">
          @for (ecarte of prix().ecartes; track ecarte.releve.id) {
            <li>
              <s>{{ euros(ecarte.releve.prix) }}</s>
              · {{ depuis(ecarte.releve.releveLe) }} · {{ preuves[ecarte.releve.preuve] }}
              — <em>{{ motifs[ecarte.motif] }}</em>
            </li>
          }
        </ul>
      }
    </details>
  `,
  styles: `
    summary { cursor: pointer; color: #333; }
    h4 { margin: 8px 0 4px; font-size: 0.9rem; }
    ul { margin: 0; padding-left: 18px; }
    .ecartes { color: #666; }
  `,
})
export class DetailReleves {
  readonly prix = input.required<PrixDeReference>();

  protected readonly preuves = PREUVES;
  protected readonly motifs = MOTIFS;
  protected readonly euros = (valeur: number) => prixEnEuros(valeur);
  protected readonly depuis = (dateIso: string) => ilYA(dateIso);
}
