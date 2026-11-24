import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { UtilisateurCourantService, UtilisateurSimule } from '../../core/utilisateur/utilisateur-courant.service';
import { ModerationApi, Proposition } from './moderation-api';
import { Moderation } from './moderation';

const ADMIN: UtilisateurSimule = { id: 3, nomAffiche: 'Admin Kadi', role: 'ADMINISTRATEUR' };
const KARIM: UtilisateurSimule = { id: 1, nomAffiche: 'Karim (consommateur)', role: 'UTILISATEUR' };
const SAUCE: Proposition = {
  id: 9, libelle: 'Sauce tomatte maison', auteur: 'Karim (consommateur)', statut: 'EN_ATTENTE',
  creeLe: '2026-11-24T09:00:00Z', libelleCommun: null,
};

describe('Moderation', () => {
  const lister = vi.fn();
  const valider = vi.fn();
  const refuser = vi.fn();
  const courant = signal<UtilisateurSimule | null>(ADMIN);

  beforeEach(() => {
    [lister, valider, refuser].forEach((espion) => espion.mockReset());
    lister.mockReturnValue(of([SAUCE]));
    courant.set(ADMIN);
    TestBed.configureTestingModule({
      imports: [Moderation],
      providers: [
        provideRouter([]),
        { provide: ModerationApi, useValue: { lister, valider, refuser, besoinsGeneriques: () => of([]) } },
        { provide: UtilisateurCourantService, useValue: { courant: computed(() => courant()) } },
      ],
    });
  });

  function creer() {
    const fixture = TestBed.createComponent(Moderation);
    fixture.detectChanges();
    return { fixture, texte: () => fixture.nativeElement.textContent as string };
  }

  it('est réservée à l’administrateur et ne charge rien pour un consommateur', () => {
    courant.set(KARIM);
    const { texte } = creer();
    expect(texte()).toContain('Réservé à l’administrateur');
    expect(lister).not.toHaveBeenCalled();
  });

  it('accepte une proposition avec le libellé corrigé et la nature choisie', () => {
    valider.mockReturnValue(of({ besoinGeneriqueId: 40, libelle: 'Sauce tomate maison', rattache: false }));
    const { fixture, texte } = creer();
    expect(texte()).toContain('Proposé par Karim (consommateur)');

    const element = fixture.nativeElement as HTMLElement;
    const libelle = element.querySelector('input') as HTMLInputElement;
    libelle.value = 'Sauce tomate maison';
    const nature = element.querySelectorAll('select')[1] as HTMLSelectElement;
    nature.value = 'LIQUIDE';
    (Array.from(element.querySelectorAll('button')).find((b) => b.textContent?.includes('Accepter')) as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(valider).toHaveBeenCalledWith(9, { libelle: 'Sauce tomate maison', nature: 'LIQUIDE', besoinExistantId: null });
    expect(texte()).toContain('« Sauce tomate maison » est maintenant proposé à tous les utilisateurs.');
    expect(element.querySelectorAll('li.proposition')).toHaveLength(0);
  });

  it('refuse une proposition, qui reste privée pour son auteur', () => {
    refuser.mockReturnValue(of(undefined));
    const { fixture, texte } = creer();
    (Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Refuser')) as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(refuser).toHaveBeenCalledWith(9);
    expect(texte()).toContain('reste privé');
  });
});
