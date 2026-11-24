import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { ProduitsApi } from '../../core/api/produits-api';
import { UtilisateurCourantService } from '../../core/utilisateur/utilisateur-courant.service';
import { LigneListe, ListeApi } from './liste-api';
import { Liste } from './liste';

const POMMES: LigneListe = {
  id: 'l1', type: 'BESOIN_GENERIQUE', referenceId: 3, libelle: 'Pommes', marque: null, formatProduit: null,
  quantite: 1.5, unite: 'KILOGRAMME', formatSouhaite: null, statutBesoin: null,
  unitesAutorisees: ['ARTICLE', 'GRAMME', 'KILOGRAMME'],
};
const FARINE: LigneListe = {
  id: 'l2', type: 'PRODUIT', referenceId: 7, libelle: 'Farine de blé T45 1 kg', marque: 'Francine', formatProduit: '1 kg',
  quantite: 2, unite: 'ARTICLE', formatSouhaite: null, statutBesoin: null, unitesAutorisees: ['ARTICLE'],
};
const SAUCE: LigneListe = {
  id: 'l3', type: 'BESOIN_PERSONNALISE', referenceId: 1, libelle: 'Sauce maison', marque: null, formatProduit: null,
  quantite: 1, unite: 'ARTICLE', formatSouhaite: null, statutBesoin: 'EN_ATTENTE',
  unitesAutorisees: ['ARTICLE', 'GRAMME', 'KILOGRAMME', 'LITRE', 'CENTILITRE'],
};

describe('Liste', () => {
  const consulter = vi.fn();
  const ajouter = vi.fn();
  const modifierQuantite = vi.fn();
  const supprimer = vi.fn();
  const utilisateurCourant = { id: signal<number | null>(1) };

  beforeEach(() => {
    [consulter, ajouter, modifierQuantite, supprimer].forEach((espion) => espion.mockReset());
    utilisateurCourant.id.set(1);
    TestBed.configureTestingModule({
      imports: [Liste],
      providers: [
        provideRouter([]),
        { provide: ListeApi, useValue: { consulter, ajouter, modifierQuantite, supprimer } },
        { provide: ProduitsApi, useValue: { rechercher: vi.fn(() => of([])) } },
        { provide: UtilisateurCourantService, useValue: utilisateurCourant },
      ],
    });
  });

  function creer() {
    const fixture = TestBed.createComponent(Liste);
    fixture.detectChanges();
    return { fixture, composant: fixture.componentInstance, texte: () => fixture.nativeElement.textContent as string };
  }

  it('affiche les trois types de ligne distincts, avec la quantité en fin de ligne (REQ-004, REQ-026)', () => {
    consulter.mockReturnValue(of({ lignes: [POMMES, FARINE, SAUCE] }));
    const { fixture, texte } = creer();
    const lignes = fixture.nativeElement.querySelectorAll('li.ligne') as NodeListOf<HTMLElement>;
    expect(lignes).toHaveLength(3);
    expect(lignes[0].textContent).toContain('Référence non précisée');
    expect(lignes[0].querySelector('.ligne__quantite')?.textContent).toContain('1,5 kg');
    expect(lignes[1].textContent).toContain('Produit précis');
    expect(lignes[1].textContent).toContain('Francine');
    expect(lignes[1].querySelector('.ligne__quantite')?.textContent).toContain('×2');
    expect(lignes[2].textContent).toContain('Besoin personnel · en attente de validation');
    expect(texte()).toContain('3');
  });

  it('demande de choisir un utilisateur quand aucun profil n’est sélectionné', () => {
    utilisateurCourant.id.set(null);
    const { fixture, texte } = creer();
    expect(texte()).toContain('Choisis un utilisateur pour voir sa liste');
    expect(consulter).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('a[href="/connexion"]')).toBeNull();
  });

  it('recharge la liste quand on change d’utilisateur dans la liste déroulante', () => {
    consulter.mockReturnValueOnce(of({ lignes: [POMMES] })).mockReturnValueOnce(of({ lignes: [] }));
    const { fixture, texte } = creer();
    expect(fixture.nativeElement.querySelectorAll('li.ligne')).toHaveLength(1);
    utilisateurCourant.id.set(2);
    fixture.detectChanges();
    expect(consulter).toHaveBeenCalledTimes(2);
    expect(texte()).toContain('Ta liste est vide');
  });

  it('n’ajoute rien avant que l’utilisateur valide, puis envoie référence, quantité, unité et format (REQ-049, REQ-066)', () => {
    consulter.mockReturnValue(of({ lignes: [] }));
    ajouter.mockReturnValue(of({ statut: 'AJOUTEE', ligneId: 'l1', lignesCandidates: [], lignes: [POMMES] }));
    const { fixture, composant, texte } = creer();

    composant.choisir({ id: 3, libelle: 'Pommes', codeBarres: null, type: 'BESOIN_GENERIQUE',
      unites: ['ARTICLE', 'GRAMME', 'KILOGRAMME'] });
    fixture.detectChanges();
    expect(ajouter).not.toHaveBeenCalled();
    expect(texte()).toContain('Référence non précisée');
    expect((fixture.nativeElement.querySelectorAll('select option') as NodeListOf<HTMLOptionElement>)).toHaveLength(3);

    composant.quantite.set('1,5');
    composant.unite.set('KILOGRAMME');
    composant.formatSouhaite.set(' filet de 1,5 kg ');
    composant.ajouter();
    fixture.detectChanges();

    expect(ajouter).toHaveBeenCalledWith({ type: 'BESOIN_GENERIQUE', referenceId: 3, libelle: null, quantite: 1.5,
      unite: 'KILOGRAMME', formatSouhaite: 'filet de 1,5 kg' });
    expect(texte()).toContain('« Pommes » a été ajouté à ta liste.');
    expect(composant.selection()).toBeNull();
  });

  it('propose seulement l’article pour un produit précis, sans format souhaité (REQ-032)', () => {
    consulter.mockReturnValue(of({ lignes: [] }));
    const { fixture, composant } = creer();
    composant.choisir({ id: 7, libelle: 'Farine', codeBarres: '2001', type: 'PRODUIT', unites: ['ARTICLE'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('select').disabled).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('Format souhaité');

    composant.quantite.set('0.5');
    composant.ajouter();
    expect(ajouter).not.toHaveBeenCalled();
    expect(composant.erreurAction()).toContain('entier');
  });

  it('crée un besoin personnel depuis « + L’ajouter quand même » (REQ-048)', () => {
    consulter.mockReturnValue(of({ lignes: [] }));
    ajouter.mockReturnValue(of({ statut: 'AJOUTEE', ligneId: 'l3', lignesCandidates: [], lignes: [SAUCE] }));
    const { fixture, composant } = creer();
    composant.ajouterQuandMeme('Sauce maison');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Mon besoin personnel');
    composant.ajouter();
    expect(ajouter).toHaveBeenCalledWith(expect.objectContaining({
      type: 'BESOIN_PERSONNALISE', referenceId: null, libelle: 'Sauce maison', unite: 'ARTICLE' }));
  });

  it('demande confirmation avant de fusionner deux formats proches, puis transmet la décision (REQ-068)', () => {
    const premiere = { ...POMMES, unite: 'ARTICLE' as const, quantite: 1, formatSouhaite: 'Sachet de 1 kg' };
    consulter.mockReturnValue(of({ lignes: [premiere] }));
    ajouter.mockReturnValueOnce(of({ statut: 'CONFIRMATION_REQUISE', ligneId: null, lignesCandidates: ['l1'], lignes: [premiere] }))
      .mockReturnValueOnce(of({ statut: 'FUSIONNEE', ligneId: 'l1', lignesCandidates: [], lignes: [{ ...premiere, quantite: 2 }] }));
    const { fixture, composant, texte } = creer();
    composant.choisir({ id: 3, libelle: 'Pommes', codeBarres: null, type: 'BESOIN_GENERIQUE', unites: ['ARTICLE'] });
    composant.formatSouhaite.set('sachet de 1 KG');
    composant.ajouter();
    fixture.detectChanges();
    expect(texte()).toContain('Fusionner avec une ligne existante ?');

    composant.confirmer(true);
    fixture.detectChanges();
    expect(ajouter).toHaveBeenLastCalledWith(expect.objectContaining({ decision: 'FUSIONNER', ligneAFusionner: 'l1' }));
    expect(texte()).not.toContain('Fusionner avec une ligne existante ?');
  });

  it('modifie la quantité et supprime une ligne (REQ-002)', () => {
    consulter.mockReturnValue(of({ lignes: [POMMES, FARINE] }));
    modifierQuantite.mockReturnValue(of({ lignes: [{ ...POMMES, quantite: 2 }, FARINE] }));
    supprimer.mockReturnValue(of(undefined));
    const { fixture, composant, texte } = creer();

    composant.modifier(POMMES);
    composant.quantiteEditee.set('2');
    composant.enregistrerQuantite(POMMES);
    fixture.detectChanges();
    expect(modifierQuantite).toHaveBeenCalledWith('l1', 2);
    expect(texte()).toContain('2 kg');

    composant.supprimer(FARINE);
    fixture.detectChanges();
    expect(supprimer).toHaveBeenCalledWith('l2');
    expect(fixture.nativeElement.querySelectorAll('li.ligne')).toHaveLength(1);
  });

});
