"""Parcours utilisateur de F1 « Construire ma liste », dans un vrai navigateur, sur ordinateur et téléphone.

Chaque test indique les critères d'acceptation (REQ) de la fiche F1 qu'il vérifie de bout en bout.
Prérequis : back lancé avec le profil ``demo`` sur la base ``kadi_e2e``, et le front. Pas de connexion :
les tests choisissent un profil simulé dans la liste déroulante « Utilisateur actuel ».
Le script ``back/scripts/tester-tout.ps1`` prépare tout cela automatiquement.
"""

from __future__ import annotations

import re

import pytest

from playwright.sync_api import Browser, Page, Playwright, expect

from conftest import API, FRONT, Utilisateur, choisir_utilisateur, nouveau_contexte, utilisateur_simule, vider_liste

# Le scénario du dossier est joué sur ordinateur et téléphone ; les autres parcours, sur ordinateur seulement,
# car leur comportement ne dépend pas de la taille d'écran.
BUREAU_SEULEMENT = pytest.mark.parametrize("appareil", ["bureau"], indirect=True)



def ouvrir_ma_liste(page: Page) -> None:
    page.goto(f"{FRONT}/liste")
    expect(page.get_by_role("heading", name="Ma liste de courses")).to_be_visible()


def rechercher(page: Page, saisie: str) -> None:
    champ = page.get_by_role("combobox", name="Que te faut-il ?")
    champ.fill(saisie)
    expect(page.locator(".panneau")).to_be_visible()
    expect(page.get_by_role("status").filter(has_text="Recherche…")).to_have_count(0)


def choisir(page: Page, texte: str, indication: str | None = None) -> None:
    option = page.get_by_role("option").filter(has_text=texte)
    if indication:
        option = option.filter(has_text=indication)
    option.first.click()
    expect(page.get_by_role("form", name="Préciser l’ajout")).to_be_visible()


def valider_ajout(page: Page, quantite: str | None = None, unite: str | None = None, format_souhaite: str | None = None,
                  attendu: str = "ajout"):
    """Remplit puis valide le formulaire. attendu = "ajout" (on attend la confirmation, comme un utilisateur),
    "confirmation" (Kadi demande s'il faut fusionner) ou "refus" (message d'erreur, rien n'est ajouté)."""
    formulaire = page.get_by_role("form", name="Préciser l’ajout")
    if quantite is not None:
        formulaire.get_by_label("Quantité").fill(quantite)
    if unite is not None:
        formulaire.get_by_label("Unité").select_option(unite)
    if format_souhaite is not None:
        formulaire.get_by_label(re.compile("Format souhaité")).fill(format_souhaite)
    formulaire.get_by_role("button", name="Ajouter à ma liste").click()
    if attendu == "ajout":
        expect(formulaire).to_be_hidden()
        expect(page.get_by_role("status").filter(has_text=re.compile("ajouté|Quantité ajoutée"))).to_be_visible()
    elif attendu == "confirmation":
        expect(page.get_by_role("alertdialog")).to_be_visible()
    else:
        expect(page.get_by_role("alert").first).to_be_visible()


def ligne(page: Page, libelle: str):
    return page.locator("li.ligne").filter(has=page.locator(".ligne__libelle", has_text=re.compile(f"^{re.escape(libelle)}$")))


@BUREAU_SEULEMENT
def test_chaque_profil_simule_a_sa_propre_liste(page: Page, utilisateur_choisi: Utilisateur):
    """Utilisateur simulé : changer de profil dans la liste déroulante affiche la liste de ce profil."""
    sophie = utilisateur_simule("Sophie (consommatrice)")
    vider_liste(sophie)
    ouvrir_ma_liste(page)
    rechercher(page, "lait")
    choisir(page, "Lait demi-écrémé", "Référence non précisée")
    valider_ajout(page, quantite="1", unite="LITRE")
    expect(page.locator("li.ligne")).to_have_count(1)

    page.get_by_label("Utilisateur actuel").select_option(str(sophie.id))
    expect(page.get_by_text("Ta liste est vide")).to_be_visible()
    page.get_by_label("Utilisateur actuel").select_option(str(utilisateur_choisi.id))
    expect(page.locator("li.ligne")).to_have_count(1)




def test_scenario_du_dossier_de_bout_en_bout(page: Page, utilisateur_choisi: Utilisateur, playwright: Playwright,
                                             browser: Browser, appareil: str):
    """REQ-018 : « lait », « pâtes barilla », « coca 6 », une faute et une saisie inconnue ; puis
    REQ-001 (retrouver sa liste en resélectionnant son profil), REQ-002 (modifier, supprimer), REQ-004, REQ-024, REQ-026, REQ-048, REQ-074."""
    ouvrir_ma_liste(page)
    expect(page.get_by_text("Ta liste est vide")).to_be_visible()

    # « lait » : le besoin générique est proposé et signalé comme tel ; quantité en litres.
    rechercher(page, "lait")
    choisir(page, "Lait demi-écrémé", "Référence non précisée")
    valider_ajout(page, quantite="2", unite="LITRE")
    expect(ligne(page, "Lait demi-écrémé").locator(".ligne__quantite")).to_have_text("2 L")
    expect(ligne(page, "Lait demi-écrémé")).to_contain_text("Référence non précisée")

    # « pâtes barilla » : plusieurs Barilla, l'utilisateur choisit ; le même ajout fusionne (REQ-024).
    rechercher(page, "pâtes barilla")
    expect(page.get_by_role("option").filter(has_text="Barilla")).to_have_count(3)
    choisir(page, "Spaghetti n°5")
    valider_ajout(page, quantite="1")
    rechercher(page, "spaghetti barilla")
    choisir(page, "Spaghetti n°5")
    valider_ajout(page, quantite="1")
    expect(page.get_by_role("status").filter(has_text="Quantité ajoutée")).to_be_visible()
    expect(ligne(page, "Spaghetti n°5").locator(".ligne__quantite")).to_have_text("×2")
    expect(ligne(page, "Spaghetti n°5")).to_contain_text("Produit précis")

    # « coca 6 » : le pack 6 x 33 cl.
    rechercher(page, "coca 6")
    choisir(page, "Coca-Cola pack 6 x 33 cl")
    valider_ajout(page)
    expect(ligne(page, "Coca-Cola pack 6 x 33 cl")).to_be_visible()

    # « yaort » : malgré la faute, le yaourt nature générique est proposé, à confirmer.
    rechercher(page, "yaort")
    choisir(page, "Yaourt nature", "À confirmer")
    valider_ajout(page, quantite="4")
    expect(ligne(page, "Yaourt nature")).to_be_visible()

    # Saisie inconnue : « + L'ajouter quand même » crée un besoin personnel identifiable (REQ-048).
    rechercher(page, "sauce maison spéciale")
    expect(page.get_by_text("Aucun produit ne correspond.")).to_be_visible()
    page.get_by_role("button", name=re.compile("L’ajouter quand même")).click()
    valider_ajout(page)
    expect(ligne(page, "sauce maison spéciale")).to_contain_text("Besoin personnel · en attente de validation")
    expect(page.locator("li.ligne")).to_have_count(5)

    # Modifier puis supprimer (REQ-002), avec refus d'une quantité nulle.
    ligne_lait = ligne(page, "Lait demi-écrémé")
    ligne_lait.get_by_role("button", name=re.compile("Modifier la quantité")).click()
    ligne_lait.get_by_label(re.compile("Nouvelle quantité")).fill("0")
    ligne_lait.get_by_role("button", name="OK").click()
    expect(page.get_by_role("alert").filter(has_text="strictement positif")).to_be_visible()
    ligne_lait.get_by_label(re.compile("Nouvelle quantité")).fill("1.5")
    ligne_lait.get_by_role("button", name="OK").click()
    expect(ligne_lait.locator(".ligne__quantite")).to_have_text("1,5 L")
    ligne(page, "Coca-Cola pack 6 x 33 cl").get_by_role("button", name=re.compile("^Retirer")).click()
    expect(page.locator("li.ligne")).to_have_count(4)

    # Rechargement puis autre appareil : la liste est conservée côté serveur (REQ-001).
    page.reload()
    expect(page.locator("li.ligne")).to_have_count(4)
    autre = nouveau_contexte(playwright, browser, appareil)
    try:
        autre_page = autre.new_page()
        choisir_utilisateur(autre_page, utilisateur_choisi)
        ouvrir_ma_liste(autre_page)
        expect(autre_page.locator("li.ligne")).to_have_count(4)
        expect(ligne(autre_page, "Lait demi-écrémé").locator(".ligne__quantite")).to_have_text("1,5 L")
    finally:
        autre.close()


@BUREAU_SEULEMENT
def test_formats_proches_demandent_confirmation(page: Page, utilisateur_choisi: Utilisateur):
    """REQ-064, REQ-065, REQ-068 : format libre conservé ; formats proches → confirmation ; refuser garde 2 lignes."""
    ouvrir_ma_liste(page)
    rechercher(page, "haricots verts")
    choisir(page, "Haricots verts surgelés", "Référence non précisée")
    valider_ajout(page, quantite="1", format_souhaite="Sachet de 1 kg")
    expect(ligne(page, "Haricots verts surgelés")).to_contain_text("Format : Sachet de 1 kg")

    rechercher(page, "haricots verts")
    choisir(page, "Haricots verts surgelés", "Référence non précisée")
    valider_ajout(page, quantite="1", format_souhaite="sachet de 1 KG", attendu="confirmation")
    dialogue = page.get_by_role("alertdialog", name="Fusionner avec une ligne existante ?")
    expect(dialogue).to_be_visible()
    dialogue.get_by_role("button", name="Garder deux lignes").click()
    expect(page.locator("li.ligne")).to_have_count(2)


@BUREAU_SEULEMENT
def test_une_fraction_de_produit_precis_est_refusee(page: Page, utilisateur_choisi: Utilisateur):
    """REQ-032 : un produit précis se compte en articles entiers."""
    ouvrir_ma_liste(page)
    rechercher(page, "farine francine")
    choisir(page, "Farine de blé T45 1 kg")
    formulaire = page.get_by_role("form", name="Préciser l’ajout")
    expect(formulaire.get_by_label("Unité")).to_be_disabled()
    valider_ajout(page, quantite="0.5", attendu="refus")
    expect(page.get_by_role("alert").filter(has_text="entier")).to_be_visible()
    expect(page.get_by_text("Ta liste est vide")).to_be_visible()


@BUREAU_SEULEMENT
def test_api_exige_un_utilisateur_simule_valide(playwright: Playwright, utilisateur_choisi: Utilisateur):
    """REQ-028 : sans en-tête X-Utilisateur-Id, ou avec un id inconnu, l'API répond 400 ; sans jeton CSRF."""
    client = playwright.request.new_context()
    try:
        assert client.get(f"{API}/liste").status == 400
        assert client.get(f"{API}/liste", headers={"X-Utilisateur-Id": "999999999"}).status == 400
        en_tete = {"X-Utilisateur-Id": str(utilisateur_choisi.id)}
        assert client.get(f"{API}/liste", headers=en_tete).status == 200
        ajout = client.post(f"{API}/liste/lignes", headers=en_tete, data={
            "type": "BESOIN_PERSONNALISE", "libelle": "Ajout direct par l'API", "quantite": 1, "unite": "ARTICLE"})
        assert ajout.status == 201
    finally:
        client.dispose()
