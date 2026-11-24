import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Accueil } from './accueil';

describe('Accueil', () => {
  it('affiche la signature de Kadi', async () => {
    await TestBed.configureTestingModule({ imports: [Accueil], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(Accueil);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Les bons comptes font les bonnes courses');
    expect(page.querySelector('img.logo')?.getAttribute('alt')).toBe('Kadi');
  });
});
