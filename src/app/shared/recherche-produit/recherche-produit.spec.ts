import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { ProduitTrouve, ProduitsApi } from '../../core/api/produits-api';
import { RechercheProduit } from './recherche-produit';

const LAIT: ProduitTrouve = { id: 1, libelle: 'Lactel Demi-écrémé 1 L', codeBarres: '3428272960015', marque: 'Lactel', quantite: '1 L', confiance: 'SUR' };
const YAOURT: ProduitTrouve = { id: 2, libelle: 'Yaourt nature', codeBarres: null, confiance: 'A_CONFIRMER' };

describe('RechercheProduit', () => {
  const rechercher = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    rechercher.mockReset();
    TestBed.configureTestingModule({
      imports: [RechercheProduit],
      providers: [provideRouter([]), { provide: ProduitsApi, useValue: { rechercher } }],
    });
  });

  afterEach(() => vi.useRealTimers());

  function creer() {
    const fixture = TestBed.createComponent(RechercheProduit);
    fixture.detectChanges();
    const champ = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    const taper = (texte: string) => {
      champ.value = texte;
      champ.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    return { fixture, champ, taper, texte: () => fixture.nativeElement.textContent as string };
  }

  it('n’interroge l’API qu’une fois, 300 ms après la dernière touche', async () => {
    rechercher.mockReturnValue(of([LAIT]));
    const { fixture, taper } = creer();
    taper('la');
    await vi.advanceTimersByTimeAsync(200);
    taper('lai');
    await vi.advanceTimersByTimeAsync(299);
    expect(rechercher).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    fixture.detectChanges();
    expect(rechercher).toHaveBeenCalledTimes(1);
    expect(rechercher).toHaveBeenCalledWith('lai', null);
  });

  it('ne lance aucune recherche avant 2 caractères', async () => {
    const { taper, texte } = creer();
    taper(' l ');
    await vi.advanceTimersByTimeAsync(500);
    expect(rechercher).not.toHaveBeenCalled();
    expect(texte()).not.toContain('Aucun produit');
  });

  it('affiche marque, quantité et code-barres, et signale un résultat à confirmer', async () => {
    rechercher.mockReturnValue(of([LAIT, YAOURT]));
    const { fixture, taper, texte } = creer();
    taper('lait');
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[role="option"]')).toHaveLength(2);
    expect(texte()).toContain('Lactel Demi-écrémé 1 L');
    expect(texte()).toContain('3428272960015');
    expect(texte()).toContain('1 L');
    expect(texte()).toContain('À confirmer');
  });

  it('n’émet produitChoisi que lorsque l’utilisateur clique sur une suggestion', async () => {
    rechercher.mockReturnValue(of([LAIT]));
    const { fixture, champ, taper } = creer();
    const choix: ProduitTrouve[] = [];
    fixture.componentInstance.produitChoisi.subscribe((produit) => choix.push(produit));
    taper('lactel');
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
    expect(choix).toEqual([]);

    (fixture.nativeElement.querySelector('[role="option"]') as HTMLElement).click();
    fixture.detectChanges();
    expect(choix).toEqual([LAIT]);
    expect(champ.value).toBe('Lactel Demi-écrémé 1 L');
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  it('permet de choisir au clavier', async () => {
    rechercher.mockReturnValue(of([LAIT, YAOURT]));
    const { fixture, champ, taper } = creer();
    const choix: ProduitTrouve[] = [];
    fixture.componentInstance.produitChoisi.subscribe((produit) => choix.push(produit));
    taper('lait');
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
    champ.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    champ.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    expect(champ.getAttribute('aria-activedescendant')).toContain('option-1');
    champ.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(choix).toEqual([YAOURT]);
  });

  it('ignore une réponse tardive d’une ancienne saisie', async () => {
    const ancienne = new Subject<ProduitTrouve[]>();
    rechercher.mockReturnValueOnce(ancienne).mockReturnValueOnce(of([YAOURT]));
    const { fixture, taper, texte } = creer();
    taper('lait');
    await vi.advanceTimersByTimeAsync(300);
    taper('yaourt');
    await vi.advanceTimersByTimeAsync(300);
    ancienne.next([LAIT]);
    fixture.detectChanges();
    expect(texte()).toContain('Yaourt nature');
    expect(texte()).not.toContain('Lactel');
  });

  it('signale l’absence de résultat', async () => {
    rechercher.mockReturnValue(of([]));
    const { fixture, taper, texte } = creer();
    taper('xyz');
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
    expect(texte()).toContain('Aucun produit ne correspond.');
  });

  it('demande de choisir un utilisateur si aucun profil n’est sélectionné (400)', async () => {
    rechercher.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400, error: { detail: 'Aucun utilisateur sélectionné : l’en-tête X-Utilisateur-Id est obligatoire.' },
    })));
    const { fixture, taper, texte } = creer();
    taper('lait');
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
    expect(texte()).toContain('Choisis un utilisateur');
  });

  it('garde la liste ouverte si l’on tape juste après avoir quitté le champ (fermeture en attente annulée)', async () => {
    rechercher.mockReturnValue(of([YAOURT]));
    const { fixture, champ, taper, texte } = creer();
    champ.dispatchEvent(new Event('blur'));
    await vi.advanceTimersByTimeAsync(50);
    taper('yaort');
    await vi.advanceTimersByTimeAsync(400);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).not.toBeNull();
    expect(texte()).toContain('Yaourt nature');
  });

  it('signale une erreur et permet de réessayer', async () => {
    rechercher.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })))
      .mockReturnValueOnce(of([LAIT]));
    const { fixture, taper, texte } = creer();
    taper('lait');
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
    expect(texte()).toContain('La recherche n’a pas abouti.');
    (fixture.nativeElement.querySelector('.etat--erreur button') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
    expect(rechercher).toHaveBeenCalledTimes(2);
    expect(texte()).toContain('Lactel');
  });

  it('peut exiger 3 caractères et limiter l’affichage à 7 suggestions (REQ-007, REQ-070)', async () => {
    rechercher.mockReturnValue(of(Array.from({ length: 12 }, (_, index) => ({
      id: index + 1, libelle: `Yaourt ${index + 1}`, codeBarres: null }))));
    const fixture = TestBed.createComponent(RechercheProduit);
    fixture.componentRef.setInput('longueurMinimale', 3);
    fixture.componentRef.setInput('nombreMaximal', 7);
    fixture.detectChanges();
    const champ = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    champ.value = 'ya';
    champ.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(500);
    expect(rechercher).not.toHaveBeenCalled();
    champ.value = 'yao';
    champ.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[role="option"]')).toHaveLength(7);
  });

  it('reste limité aux produits précis sans portée (contrat F2)', async () => {
    rechercher.mockReturnValue(of([LAIT]));
    const { fixture, taper, texte } = creer();
    taper('lait');
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
    expect(rechercher).toHaveBeenCalledWith('lait', null);
    expect(texte()).not.toContain('L’ajouter quand même');
  });

  it('avec la portée « liste », distingue les besoins et propose « + L’ajouter quand même » (REQ-048, REQ-074)', async () => {
    rechercher.mockReturnValue(of([
      { id: 5, libelle: 'Yaourt nature', codeBarres: null, type: 'BESOIN_GENERIQUE', unites: ['ARTICLE'] },
      { id: 1, libelle: 'Sauce maison', codeBarres: null, type: 'BESOIN_PERSONNALISE', unites: ['ARTICLE'] },
    ]));
    const fixture = TestBed.createComponent(RechercheProduit);
    fixture.componentRef.setInput('portee', 'liste');
    fixture.detectChanges();
    const libres: string[] = [];
    fixture.componentInstance.ajouterQuandMeme.subscribe((texte) => libres.push(texte));
    const champ = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    champ.value = ' yaourt ';
    champ.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    expect(rechercher).toHaveBeenCalledWith('yaourt', 'liste');
    const texte = fixture.nativeElement.textContent as string;
    expect(texte).toContain('Référence non précisée');
    expect(texte).toContain('Mon besoin');
    (fixture.nativeElement.querySelector('.ajout-libre') as HTMLButtonElement).click();
    expect(libres).toEqual(['yaourt']);
  });
});
