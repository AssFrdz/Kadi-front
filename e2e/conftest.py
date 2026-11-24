"""Configuration des tests de bout en bout de Kadi (F1 « Ma liste »).

Ces tests pilotent un vrai navigateur sur le front Angular, branché sur le vrai back et un PostgreSQL dédié
(base ``kadi_e2e``, jamais la base de travail ``kadi``). Il n'y a pas de connexion : chaque test choisit un
profil simulé dans la liste déroulante « Utilisateur actuel », après avoir vidé sa liste par l'API.

Variables d'environnement facultatives :
  KADI_E2E_FRONT    URL du front   (défaut http://127.0.0.1:4200)
  KADI_E2E_API      URL de l'API   (défaut http://127.0.0.1:8080/api/v1)
"""

from __future__ import annotations

import json
import os
import re
import urllib.request
from dataclasses import dataclass
from pathlib import Path

import pytest
from playwright.sync_api import Browser, BrowserContext, Page, Playwright, expect

FRONT = os.environ.get("KADI_E2E_FRONT", "http://127.0.0.1:4200")
API = os.environ.get("KADI_E2E_API", "http://127.0.0.1:8080/api/v1")


# Deux formats d'écran : ordinateur de bureau puis téléphone (Chromium en émulation mobile).
APPAREILS = {
    "bureau": {"viewport": {"width": 1366, "height": 900}},
    "telephone": "Pixel 7",
}

expect.set_options(timeout=10_000)


@dataclass(frozen=True)
class Utilisateur:
    id: int
    nom_affiche: str


@pytest.fixture(params=list(APPAREILS), ids=list(APPAREILS))
def appareil(request) -> str:
    return request.param


def nouveau_contexte(playwright: Playwright, browser: Browser, appareil: str) -> BrowserContext:
    reglage = APPAREILS[appareil]
    options = dict(playwright.devices[reglage]) if isinstance(reglage, str) else dict(reglage)
    options.pop("default_browser_type", None)
    return browser.new_context(locale="fr-FR", **options)


@pytest.fixture
def contexte(playwright: Playwright, browser: Browser, appareil: str):
    ctx = nouveau_contexte(playwright, browser, appareil)
    yield ctx
    ctx.close()


RESULTATS = Path(__file__).parent / "test-results"


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    resultat = (yield).get_result()
    setattr(item, "rapport_" + resultat.when, resultat)


@pytest.fixture
def page(contexte: BrowserContext, request) -> Page:
    """Page du test. En cas d'échec : capture d'écran et réponses HTTP en erreur dans test-results/."""
    page = contexte.new_page()
    erreurs: list[str] = []

    def noter(reponse):
        if reponse.status >= 400 and "/api/" in reponse.url:
            try:
                corps = reponse.text()[:300]
            except Exception:
                corps = ""
            erreurs.append(f"{reponse.status} {reponse.request.method} {reponse.url} {corps}")

    page.on("response", noter)
    yield page
    rapport = getattr(request.node, "rapport_call", None)
    if rapport is not None and rapport.failed:
        RESULTATS.mkdir(exist_ok=True)
        nom = re.sub(r"[^\w.-]+", "_", request.node.name)
        page.screenshot(path=str(RESULTATS / f"{nom}.png"), full_page=True)
        resume = "\n".join(erreurs) or "Aucune réponse API en erreur."
        (RESULTATS / f"{nom}.txt").write_text(resume, encoding="utf-8")
        print(f"\nCapture : {RESULTATS / (nom + '.png')}\nRéponses API en erreur :\n{resume}")


def _api(methode: str, chemin: str, utilisateur_id: int | None = None):
    requete = urllib.request.Request(f"{API}{chemin}", method=methode)
    if utilisateur_id is not None:
        requete.add_header("X-Utilisateur-Id", str(utilisateur_id))
    with urllib.request.urlopen(requete, timeout=10) as reponse:
        contenu = reponse.read()
    return json.loads(contenu) if contenu else None


def utilisateur_simule(nom_affiche: str) -> Utilisateur:
    """Profil créé par la migration V4 (« Karim (consommateur) », « Sophie (consommatrice) », « Admin Kadi »)."""
    for profil in _api("GET", "/utilisateurs"):
        if profil["nomAffiche"] == nom_affiche:
            return Utilisateur(profil["id"], profil["nomAffiche"])
    raise AssertionError(f"Profil simulé introuvable : {nom_affiche}. La base a-t-elle été recréée avec la V4 actuelle ?")


def vider_liste(utilisateur: Utilisateur) -> None:
    """Les profils simulés sont partagés : chaque test repart d'une liste vide."""
    for ligne in _api("GET", "/liste", utilisateur.id)["lignes"]:
        _api("DELETE", f"/liste/lignes/{ligne['id']}", utilisateur.id)


def choisir_utilisateur(page: Page, utilisateur: Utilisateur) -> None:
    """Sélectionne le profil dans la liste déroulante « Utilisateur actuel », comme un utilisateur."""
    page.goto(FRONT)
    selecteur = page.get_by_label("Utilisateur actuel")
    expect(selecteur.locator("option", has_text=utilisateur.nom_affiche)).to_have_count(1)
    selecteur.select_option(str(utilisateur.id))
    expect(selecteur).to_have_value(str(utilisateur.id))


@pytest.fixture
def utilisateur_choisi(page: Page) -> Utilisateur:
    """Karim, avec une liste vide, sélectionné dans la liste déroulante du test."""
    utilisateur = utilisateur_simule("Karim (consommateur)")
    vider_liste(utilisateur)
    choisir_utilisateur(page, utilisateur)
    return utilisateur
