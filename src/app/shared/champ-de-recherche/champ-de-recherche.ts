import { Component, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, map, Observable, of, Subject, switchMap } from 'rxjs';

/**
 * Champ de recherche avec suggestions, partagé par les écrans (produits, magasins).
 * On lui donne la fonction qui cherche et celle qui affiche un élément ; il renvoie l'élément choisi.
 * Il n'interroge l'API qu'à partir de 2 caractères, 300 ms après la dernière touche.
 */
@Component({
  selector: 'app-champ-de-recherche',
  template: `
    <label class="champ">
      <span>{{ etiquette() }}</span>
      <input
        type="search"
        autocomplete="off"
        [placeholder]="indication()"
        [value]="texte()"
        (input)="taper($any($event.target).value)"
      />
    </label>
    @if (suggestions().length > 0) {
      <ul class="suggestions">
        @for (suggestion of suggestions(); track $index) {
          <li>
            <button type="button" (click)="choisir(suggestion)">{{ libelle()(suggestion) }}</button>
          </li>
        }
      </ul>
    } @else if (aucunResultat()) {
      <p class="aucun">Aucun résultat pour « {{ texte() }} »</p>
    }
  `,
  styles: `
    .champ { display: flex; flex-direction: column; gap: 4px; }
    input { padding: 8px; font-size: 1rem; }
    .suggestions { list-style: none; margin: 4px 0 0; padding: 0; border: 1px solid #ddd; }
    .suggestions button { width: 100%; padding: 8px; text-align: left; background: none; border: none; cursor: pointer; }
    .suggestions button:hover { background: #f2f2f2; }
    .aucun { color: #666; margin: 4px 0 0; }
  `,
})
export class ChampDeRecherche<T> {
  readonly etiquette = input.required<string>();
  readonly indication = input('');
  /** Comment chercher : par exemple, la méthode rechercher de ProduitsApi. */
  readonly chercher = input.required<(texte: string) => Observable<T[]>>();
  /** Ce qu'on affiche pour un élément : par exemple, le libellé d'un produit. */
  readonly libelle = input.required<(element: T) => string>();
  readonly choisi = output<T>();

  protected readonly texte = signal('');
  protected readonly suggestions = signal<T[]>([]);
  protected readonly aucunResultat = signal(false);

  private readonly frappes = new Subject<string>();

  constructor() {
    this.frappes
      .pipe(
        debounceTime(300),
        map((texte) => texte.trim()),
        distinctUntilChanged(),
        // switchMap abandonne la recherche précédente si l'on tape encore : seule la dernière réponse compte
        switchMap((texte) =>
          texte.length < 2
            ? of({ texte, resultats: [] as T[] })
            : this.chercher()(texte).pipe(
                map((resultats) => ({ texte, resultats })),
                catchError(() => of({ texte, resultats: [] as T[] })),
              ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ texte, resultats }) => {
        this.suggestions.set(resultats);
        this.aucunResultat.set(texte.length >= 2 && resultats.length === 0);
      });
  }

  protected taper(texte: string): void {
    this.texte.set(texte);
    this.frappes.next(texte);
  }

  protected choisir(element: T): void {
    this.texte.set(this.libelle()(element));
    this.suggestions.set([]);
    this.aucunResultat.set(false);
    this.choisi.emit(element);
  }
}
