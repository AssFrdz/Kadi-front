import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { signal } from '@angular/core';
import { UtilisateurCourantService } from '../../core/utilisateur/utilisateur-courant.service';
import { ListeApi } from '../liste/liste-api';
import { CatalogueApi, ProduitCatalogue } from './catalogue-api';
import { Catalogue } from './catalogue';

describe('Catalogue', () => {
  const consulter = vi.fn();
  const consulterParNom = vi.fn();
  const listerMarques = vi.fn();
  const rechercher = vi.fn();
  const ajouter = vi.fn();
  const utilisateurCourant = { id: signal<number | null>(1) };

  beforeEach(() => {
    consulter.mockReset();
    consulterParNom.mockReset();
    listerMarques.mockReset();
    listerMarques.mockReturnValue(of([]));
    rechercher.mockReset();
    ajouter.mockReset();
    utilisateurCourant.id.set(1);
    TestBed.configureTestingModule({
      imports: [Catalogue],
      providers: [
        provideRouter([]),
        { provide: CatalogueApi, useValue: { consulter, consulterParNom, rechercher, listerMarques } },
        { provide: ListeApi, useValue: { ajouter } },
        { provide: UtilisateurCourantService, useValue: utilisateurCourant },
      ],
    });
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

  describe('ajout à ma liste depuis le catalogue', () => {
    const SPAGHETTI: ProduitCatalogue = {
      id: 42, libelle: 'Spaghetti n°5', codeBarres: '2001000000042', sourceUrl: null,
      imageUrl: 'https://images.openfoodfacts.org/spaghetti.jpg', imageAuteur: 'auteur', marque: 'Barilla', format: '500 g',
    };

    function afficher() {
      consulter.mockReturnValue(of({ produits: [SPAGHETTI], prochainId: null }));
      const fixture = TestBed.createComponent(Catalogue);
      fixture.detectChanges();
      const bouton = () => fixture.nativeElement.querySelector('button.ajout-liste') as HTMLButtonElement;
      return { fixture, bouton, texte: () => fixture.nativeElement.textContent as string };
    }

    it('ajoute une unité du produit précis à la liste et le confirme', () => {
      ajouter.mockReturnValue(of({ statut: 'AJOUTEE', ligneId: 'l1', lignesCandidates: [], lignes: [] }));
      const { fixture, bouton, texte } = afficher();
      bouton().click();
      fixture.detectChanges();
      expect(ajouter).toHaveBeenCalledWith({ type: 'PRODUIT', referenceId: 42, quantite: 1, unite: 'ARTICLE' });
      expect(texte()).toContain('Ajouté à ta liste.');
      expect(fixture.nativeElement.querySelector('a[href="/liste"]')).not.toBeNull();
    });

    it('demande de choisir un utilisateur sans appeler l’API', () => {
      utilisateurCourant.id.set(null);
      const { fixture, bouton, texte } = afficher();
      bouton().click();
      fixture.detectChanges();
      expect(ajouter).not.toHaveBeenCalled();
      expect(texte()).toContain('Choisis un utilisateur');
    });

  });
});
