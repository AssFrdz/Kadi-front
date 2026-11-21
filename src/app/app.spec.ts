import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { routes } from './app.routes';
import { environment } from '../environments/environment';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  const etatAffiche = () =>
    (fixture.nativeElement as HTMLElement).querySelector('.etat-api')?.textContent;

  it('affiche la version de l’API quand elle répond', () => {
    http.expectOne(`${environment.apiUrl}/info`).flush({ name: 'kadi-back', version: '0.1.0' });
    fixture.detectChanges();

    expect(etatAffiche()).toContain('API 0.1.0');
  });

  it('signale une API injoignable', () => {
    http
      .expectOne(`${environment.apiUrl}/info`)
      .error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();

    expect(etatAffiche()).toContain('API injoignable');
  });
});
