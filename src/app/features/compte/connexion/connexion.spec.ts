import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CompteApi, CompteSession } from '../compte-api';
import { Connexion } from './connexion';

describe('Connexion', () => {
  const compte: CompteSession = {
    id: 12,
    email: 'assia@example.com',
    role: 'UTILISATEUR',
    emailVerifie: true,
  };
  let api: {
    connecter: ReturnType<typeof vi.fn>;
    lireSession: ReturnType<typeof vi.fn>;
    deconnecter: ReturnType<typeof vi.fn>;
    lireErreur: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      connecter: vi.fn().mockReturnValue(of(compte)),
      lireSession: vi.fn().mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 401 })),
      ),
      deconnecter: vi.fn().mockReturnValue(of(undefined)),
      lireErreur: vi.fn((_erreur: unknown, message: string) => message),
    };

    TestBed.configureTestingModule({
      imports: [Connexion],
      providers: [provideRouter([]), { provide: CompteApi, useValue: api }],
    });
  });

  it('connecte le compte et affiche la session créée', async () => {
    const fixture = TestBed.createComponent(Connexion);
    await fixture.whenStable();
    fixture.componentInstance.formulaire.setValue({
      email: compte.email,
      motDePasse: 'un-mot-de-passe-solide',
    });

    fixture.componentInstance.connecter();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.connecter).toHaveBeenCalledWith(compte.email, 'un-mot-de-passe-solide');
    expect(fixture.nativeElement.textContent).toContain(compte.email);
    expect(fixture.nativeElement.textContent).toContain('Tu es connectée.');
  });

  it('ferme la session depuis la page de connexion', async () => {
    api.lireSession.mockReturnValue(of(compte));
    const fixture = TestBed.createComponent(Connexion);
    await fixture.whenStable();

    fixture.componentInstance.deconnecter();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.deconnecter).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.session()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Ravie de te revoir.');
  });

  it('ne transmet pas un formulaire invalide', async () => {
    const fixture = TestBed.createComponent(Connexion);
    await fixture.whenStable();

    fixture.componentInstance.connecter();

    expect(api.connecter).not.toHaveBeenCalled();
    expect(fixture.componentInstance.formulaire.controls.email.touched).toBe(true);
  });
});
