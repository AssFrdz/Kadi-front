import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CatalogueApi } from './catalogue-api';
import { Catalogue } from './catalogue';

describe('Catalogue', () => {
  const consulter = vi.fn();
  const rechercher = vi.fn();

  beforeEach(() => {
    consulter.mockReset();
    rechercher.mockReset();
    TestBed.configureTestingModule({
      imports: [Catalogue],
      providers: [provideRouter([]), { provide: CatalogueApi, useValue: { consulter, rechercher } }],
    });
  });

    it('limite les appels et ignore les réponses dépassées', async () => {
      vi.useFakeTimers();
      try {
        consulter.mockReturnValue(of({ produits: [], prochainId: null }));
        const ancienne = new Subject<{ produits: never[]; prochainCurseur: null }>();
        const nouvelle = new Subject<{ produits: never[]; prochainCurseur: null }>();
        rechercher.mockReturnValueOnce(ancienne).mockReturnValueOnce(nouvelle);
        const fixture = TestBed.createComponent(Catalogue);
        fixture.detectChanges();
        fixture.componentInstance.rechercher('nu');
        await vi.advanceTimersByTimeAsync(300);
        expect(rechercher).not.toHaveBeenCalled();
        fixture.componentInstance.rechercher('nut');
        await vi.advanceTimersByTimeAsync(300);
        fixture.componentInstance.rechercher('coca');
        ancienne.next({ produits: [], prochainCurseur: null });
        expect(fixture.componentInstance.rechercheEffectuee()).toBe(false);
        await vi.advanceTimersByTimeAsync(300);
        nouvelle.next({ produits: [], prochainCurseur: null });
        expect(fixture.componentInstance.rechercheEffectuee()).toBe(true);
        expect(rechercher).toHaveBeenLastCalledWith('coca', null, 7, { marque: '', format: '' });
        fixture.componentInstance.rechercher('');
        expect(fixture.componentInstance.rechercheActive()).toBe(false);
        fixture.destroy();
      } finally {
        vi.useRealTimers();
      }
    });

    it('signale un échec de recherche sans l’afficher comme une absence de résultat', async () => {
      vi.useFakeTimers();
      try {
        consulter.mockReturnValue(of({ produits: [], prochainId: null }));
        rechercher.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
        const fixture = TestBed.createComponent(Catalogue);
        fixture.detectChanges();
        fixture.componentInstance.rechercher('nut');
        await vi.advanceTimersByTimeAsync(300);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('pas pu rechercher');
        expect(fixture.nativeElement.textContent).not.toContain('Aucune suggestion');
        fixture.destroy();
      } finally {
        vi.useRealTimers();
      }
    });
  it('invite à se connecter lorsque la session est absente', async () => {
    consulter.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const fixture = TestBed.createComponent(Catalogue);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Pour voir le catalogue, connecte-toi.');
    expect(fixture.nativeElement.querySelector('a[href="/connexion"]')).not.toBeNull();
  });

  it('explique clairement que le catalogue est vide', async () => {
    consulter.mockReturnValue(of({ produits: [], prochainId: null }));
    const fixture = TestBed.createComponent(Catalogue);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Il n’y a pas encore de produits ici.');
    expect(fixture.nativeElement.querySelectorAll('li')).toHaveLength(0);
  });

  it('affiche les produits et leur illustration de remplacement puis charge la suite', async () => {
    consulter
      .mockReturnValueOnce(of({
        produits: [{ id: 1, libelle: 'Produit de test', codeBarres: null }],
        prochainId: 1,
      }))
      .mockReturnValueOnce(of({
        produits: [{ id: 2, libelle: 'Autre produit de test', codeBarres: '12345' }],
        prochainId: null,
      }));
    const fixture = TestBed.createComponent(Catalogue);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Produit de test');
    expect(fixture.nativeElement.textContent).toContain('Photo non disponible');
    fixture.componentInstance.chargerSuite();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(consulter).toHaveBeenLastCalledWith(1, { marque: '', format: '' });
    expect(fixture.nativeElement.querySelectorAll('li')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Autre produit de test');
    expect(fixture.nativeElement.textContent).not.toContain('Code-barres : 12345');
    expect(fixture.componentInstance.prochainId()).toBeNull();
  });

  it('affiche la photo, ses crédits et la provenance puis remplace une image inaccessible', async () => {
    consulter.mockReturnValue(of({
      produits: [{
        id: 1, libelle: 'Produit de test', codeBarres: '12345',
        sourceUrl: 'https://world.openfoodfacts.org/product/12345',
        imageUrl: 'https://images.openfoodfacts.org/images/test.jpg', imageAuteur: 'auteur-test',
      }],
      prochainId: null,
    }));
    const fixture = TestBed.createComponent(Catalogue);
    await fixture.whenStable();
    fixture.detectChanges();

    const photo = fixture.nativeElement.querySelector('img.photo') as HTMLImageElement;
    expect(photo.alt).toBe('Photo de Produit de test');
    expect(fixture.nativeElement.textContent).toContain('auteur-test / Open Food Facts');
    expect(fixture.nativeElement.querySelector('a[href="https://creativecommons.org/licenses/by-sa/3.0/"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="https://world.openfoodfacts.org/product/12345"]')).not.toBeNull();
    photo.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img.photo')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Photo non disponible');
    expect(fixture.nativeElement.textContent).toContain('Données :');
  });

  it('affiche la marque et le format uniquement quand ils sont connus', async () => {
    consulter.mockReturnValue(of({
      produits: [
        { id: 1, libelle: 'Pâtes', codeBarres: null, marque: 'Marque test', format: '500 g' },
        { id: 2, libelle: 'Produit sans détails', codeBarres: null, marque: null, format: null },
      ], prochainId: null,
    }));
    const fixture = TestBed.createComponent(Catalogue);
    await fixture.whenStable();
    fixture.detectChanges();
    const cartes = fixture.nativeElement.querySelectorAll('li');
    expect(cartes[0].textContent).toContain('Marque test');
    expect(cartes[0].textContent).toContain('500 g');
    expect(cartes[1].textContent).toContain('Marque non renseignée');
    expect(cartes[1].textContent).not.toContain('500 g');
  });

  it('ouvre le panneau mobile et soumet les filtres au clavier', async () => {
    consulter.mockReturnValue(of({ produits: [], prochainId: null }));
    const fixture = TestBed.createComponent(Catalogue);
    fixture.detectChanges();
    const bouton = fixture.nativeElement.querySelector('.toggle-filtres') as HTMLButtonElement;
    expect(bouton.getAttribute('aria-expanded')).toBe('false');
    bouton.click();
    fixture.detectChanges();
    expect(bouton.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('#contenu-filtres').classList.contains('contenu-filtres--ouvert')).toBe(true);
    const marque = fixture.nativeElement.querySelector('#filtre-marque') as HTMLInputElement;
    marque.value = 'Nutella';
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(consulter).toHaveBeenLastCalledWith(0, { marque: 'Nutella', format: '' });
    fixture.destroy();
  });

  it('propose la suite seulement si elle existe et réessaie la page échouée', async () => {
    vi.useFakeTimers();
    try {
      consulter.mockReturnValue(of({ produits: [], prochainId: null }));
      rechercher
        .mockReturnValueOnce(of({ produits: [{ id: 1, libelle: 'Nutella', codeBarres: null }], prochainCurseur: 'curseur' }))
        .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })))
        .mockReturnValueOnce(of({ produits: [{ id: 2, libelle: 'Nutella 2', codeBarres: null }], prochainCurseur: null }));
      const fixture = TestBed.createComponent(Catalogue);
      fixture.detectChanges();
      fixture.componentInstance.rechercher('nut');
      await vi.advanceTimersByTimeAsync(300);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Voir tous les résultats');
      fixture.componentInstance.chargerResultats();
      await vi.advanceTimersByTimeAsync(1);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('pas pu rechercher');
      expect(fixture.componentInstance.suggestions()).toHaveLength(1);
      fixture.componentInstance.reessayerRecherche();
      await vi.advanceTimersByTimeAsync(1);
      fixture.detectChanges();
      expect(rechercher).toHaveBeenLastCalledWith('nut', 'curseur', 20, { marque: '', format: '' });
      expect(fixture.componentInstance.suggestions()).toHaveLength(2);
      expect(fixture.nativeElement.textContent).not.toContain('Voir plus de résultats');
      fixture.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('ne mélange pas une ancienne page avec une nouvelle recherche', async () => {
    vi.useFakeTimers();
    try {
      consulter.mockReturnValue(of({ produits: [], prochainId: null }));
      const anciennePage = new Subject<{ produits: never[]; prochainCurseur: null }>();
      rechercher
        .mockReturnValueOnce(of({ produits: [{ id: 1, libelle: 'Nutella', codeBarres: null }], prochainCurseur: 'suite' }))
        .mockReturnValueOnce(anciennePage)
        .mockReturnValueOnce(of({ produits: [{ id: 2, libelle: 'Coca', codeBarres: null }], prochainCurseur: null }));
      const fixture = TestBed.createComponent(Catalogue);
      fixture.detectChanges();
      fixture.componentInstance.rechercher('nut');
      await vi.advanceTimersByTimeAsync(300);
      fixture.componentInstance.chargerResultats();
      await vi.advanceTimersByTimeAsync(1);
      fixture.componentInstance.rechercher('coca');
      anciennePage.next({ produits: [], prochainCurseur: null });
      await vi.advanceTimersByTimeAsync(300);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Coca');
      expect(fixture.nativeElement.textContent).not.toContain('Nutella');
      expect(fixture.nativeElement.textContent).not.toContain('Voir tous les résultats');
      fixture.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('affiche les suggestions puis retrouve les produits parcourus quand la recherche est effacée', async () => {
    vi.useFakeTimers();
    try {
      consulter.mockReturnValue(of({
        produits: [{ id: 1, libelle: 'Catalogue', codeBarres: null }], prochainId: null,
      }));
      rechercher.mockReturnValue(of({ produits: [{ id: 2, libelle: 'Nutella', codeBarres: null }], prochainCurseur: null }));
      const fixture = TestBed.createComponent(Catalogue);
      fixture.detectChanges();
      fixture.componentInstance.rechercher('nut');
      await vi.advanceTimersByTimeAsync(300);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[aria-label="Suggestions de produits"]')?.textContent).toContain('Nutella');
      expect(fixture.nativeElement.querySelector('[aria-label="Produits du catalogue"]')).toBeNull();
      fixture.componentInstance.rechercher('');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[aria-label="Produits du catalogue"]')?.textContent).toContain('Catalogue');
      fixture.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('affiche une erreur et permet de réessayer la page qui a échoué', async () => {
    consulter
      .mockReturnValueOnce(of({ produits: [{ id: 1, libelle: 'Produit', codeBarres: null }], prochainId: 1 }))
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 503 })))
      .mockReturnValueOnce(of({ produits: [], prochainId: null }));
    const fixture = TestBed.createComponent(Catalogue);
    await fixture.whenStable();
    fixture.componentInstance.chargerSuite();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('pas pu charger');
    const bouton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((element) => element.textContent?.includes('Réessayer'));
    bouton?.click();
    await fixture.whenStable();

    expect(consulter).toHaveBeenLastCalledWith(1, { marque: '', format: '' });
    expect(fixture.componentInstance.erreur()).toBe('');
  });

  it('applique les filtres au catalogue et à la recherche et ignore les anciennes pages', async () => {
    vi.useFakeTimers();
    try {
      const ancienCatalogue = new Subject<{ produits: never[]; prochainId: null }>();
      const ancienneRecherche = new Subject<{ produits: never[]; prochainCurseur: null }>();
      consulter.mockReturnValueOnce(ancienCatalogue).mockReturnValueOnce(of({ produits: [], prochainId: null }));
      rechercher.mockReturnValueOnce(ancienneRecherche)
        .mockReturnValueOnce(of({ produits: [], prochainCurseur: null }));
      const fixture = TestBed.createComponent(Catalogue);
      fixture.detectChanges();
      fixture.componentInstance.rechercher('yaourt');
      await vi.advanceTimersByTimeAsync(300);
      fixture.componentInstance.appliquerFiltres(' Marque test ', ' 500 g ');
      ancienCatalogue.next({ produits: [], prochainId: null });
      ancienneRecherche.next({ produits: [], prochainCurseur: null });
      expect(fixture.componentInstance.rechercheEffectuee()).toBe(false);
      await vi.advanceTimersByTimeAsync(300);
      expect(consulter).toHaveBeenLastCalledWith(0, { marque: 'Marque test', format: '500 g' });
      expect(rechercher).toHaveBeenLastCalledWith('yaourt', null, 7, { marque: 'Marque test', format: '500 g' });
      fixture.componentInstance.rechercher('');
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Aucun produit ne correspond à ces filtres.');
      expect(fixture.nativeElement.textContent).not.toContain('Le catalogue local n’a pas encore été alimenté.');
      fixture.destroy();
    } finally {
      vi.useRealTimers();
    }
  });
});
