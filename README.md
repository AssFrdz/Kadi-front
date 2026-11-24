# Kadi — front

Socle Angular de Kadi. La [charte visuelle](doc/charte-visuelle.md) constitue la référence commune pour les futures features.

## Démarrer

Prérequis : Node.js compatible avec la version d'Angular indiquée dans `package.json` et npm.

```bash
npm ci
npm start
```

Ouvrir <http://localhost:4200>. La charte vivante est sur <http://localhost:4200/charte>. Pour vérifier le projet : `npm run build` et `npm test -- --watch=false`. Pour lancer tous les niveaux de tests (back, front et bout en bout), utiliser `back/scripts/tester-tout.ps1` (voir le README du back).

## État et organisation

La page d'accueil est une vitrine de la charte. Il n'y a pas de connexion : la liste déroulante « Utilisateur actuel », en haut de chaque page, simule l'utilisateur connecté (profils fournis par `GET /api/v1/utilisateurs`) ; le catalogue est consultable et « Ma liste » permet de construire sa liste de courses (F1).

- `src/styles/tokens.css` : couleurs, polices, espacements, rayons, reliefs (seule source des valeurs).
- `src/styles/base.css` : reset et règles globales ; `components.css` : boutons, champs, pastilles, cartes.
- `src/app/features/accueil/` et `src/app/features/charte/` : pages existantes, chargées à la demande.
- `public/logo-kadi.png` : logo détouré (fond transparent) tiré de `Logo Kadi.png` ; `public/favicon.svg` : panier seul, en vectoriel.
- `doc/charte-visuelle.md` : intentions de design et règles d'usage.
- `src/app/core/api/produits-api.ts` : seul fichier qui appelle `GET /api/v1/produits` (recherche commune F1/F2).
- `src/app/shared/recherche-produit/` : champ de recherche de produit partagé (F1 « Ma liste », F2 « Prix d'un produit » et « Ajouter un prix »).
- `src/app/features/liste/` : écran « Ma liste » et `ListeApi`, seul fichier qui appelle `/api/v1/liste`.
- `e2e/` : parcours de bout en bout Playwright (Python, `pytest`).

Pour les prochaines features, créer un dossier par domaine sous `src/app/features/`, et placer les composants et services réellement partagés sous `src/app/shared/`. Ne pas créer d'abstraction ou d'endpoint hypothétique avant d'en avoir besoin. Centraliser les appels HTTP dans des services dédiés et typer les réponses à partir du contrat OpenAPI effectif, en présentant explicitement chargement, erreur et absence de données.

**Utilisateur simulé.** `UtilisateurCourantService` (`src/app/core/utilisateur/`) charge les profils, garde l'id choisi dans un signal et dans `localStorage` (premier consommateur par défaut). L'intercepteur `utilisateurCourantInterceptor` ajoute l'en-tête `X-Utilisateur-Id` à chaque appel de l'API ; aucun cookie ni jeton CSRF n'est échangé. Le composant `kadi-selecteur-utilisateur` affiche la liste déroulante ; changer de profil recharge « Ma liste ».

La page <http://127.0.0.1:4200/catalogue> affiche les produits déjà présents dans la base, par pages, sans connexion. Chaque carte a un bouton « + Ajouter à ma liste » qui ajoute une unité du produit à la liste de l'utilisateur choisi (un second clic augmente la quantité), et sa photo s'ouvre en grand dans un nouvel onglet. La barre de recherche et les cartes produit sont accompagnées d'un panneau de filtres latéral, repliable sur téléphone. Elle indique si le catalogue est vide. Pour les fiches importées, elle affiche la photo Open Food Facts disponible avec ses crédits, ou une illustration de remplacement si elle est absente ou inaccessible. La recherche propose jusqu'à sept fiches du catalogue local dès trois caractères, sans interroger Open Food Facts à chaque saisie ; lorsqu'il existe plus de résultats retenus, « Voir tous les résultats » permet de les parcourir par pages. Les filtres marque et format s'appliquent à la recherche et au parcours du catalogue local, puis réinitialisent la pagination en cours. Effacer la recherche rétablit le catalogue. Voir le README du back pour les licences et les limites de ce prototype. Les filtres de catégorie et de type, les tris avancés et un import à grande échelle restent à implémenter ; l'ajout se fait depuis « Ma liste ».

La marque et le format sont affichés lorsqu'ils sont renseignés et contribuent à la recherche. Ils ne sont pas inventés s'ils manquent. Cette version nécessite la V4 actuelle du back (comptes, catalogue et liste regroupés).

Le parcours du catalogue propose l'ordre initial ou le tri par nom, sans perdre les filtres ; le tri est appliqué sur l'ensemble du catalogue avant pagination. Les suggestions restent classées par pertinence. Les limites du tri et de sa pagination sont précisées dans le README du back.

Le filtre de marque propose une sélection unique dans les marques connues. Le nombre affiché compte les produits correspondant à la recherche et au format actifs, toutes pages confondues, sans appliquer la marque elle-même ; les produits sans marque renseignée ne sont pas comptés. Les limites de performance et de regroupement des marques sont décrites dans le README du back.

Un filtre Nutri-Score à sélection multiple est préparé derrière `NUTRI_SCORE_ACTIF`, désactivé par défaut. Il exclut les produits sans note lorsque des notes sont sélectionnées et transmet celles-ci aux résultats et aux compteurs de marques. Il ne faut pas l'activer pour les utilisateurs avant la migration, l'alimentation vérifiée des notes et les validations indiquées dans le README du back.

Une configuration de développement explicite permet de préparer un essai isolé de l'interface : `npm start -- --configuration nutri-score-experimental`. Les configurations habituelles de développement et de production laissent le filtre désactivé. Ne pas lancer cette configuration sur le catalogue réel avant d'avoir validé la migration, les données et l'activation correspondante du back ; l'option du front ne les active pas automatiquement.

## Ma liste (F1)

<http://127.0.0.1:4200/liste>, pour le profil choisi dans la liste déroulante « Utilisateur actuel ». Sans profil sélectionné, la page invite à en choisir un ; changer de profil affiche la liste de ce profil.

- La recherche propose, dès 2 caractères, les produits précis, les besoins génériques (indiqués « Référence non précisée ») et les besoins personnels de l'utilisateur (« Mon besoin »). Un résultat approché, par exemple malgré une faute de frappe, est signalé « À confirmer ».
- Rien n'est ajouté avant que l'utilisateur choisisse une suggestion puis valide la quantité, l'unité et, pour un besoin, un format souhaité facultatif conservé tel que saisi. Les unités proposées sont celles renvoyées par le back : article seulement pour un produit précis, selon la nature pour un besoin générique.
- Si rien ne convient, « + L'ajouter quand même » crée un besoin personnel, identifié comme tel et en attente de validation.
- Ajouter la même référence additionne les quantités ; si un format écrit différemment ressemble à une ligne existante, Kadi demande s'il faut fusionner ou garder deux lignes.
- Chaque ligne affiche son type, sa marque et son format éventuels, et la quantité en petit en fin de ligne ; elle peut être modifiée ou retirée. Les erreurs du back (quantité invalide, aucun utilisateur sélectionné, refus de droits) sont expliquées sans perdre la liste.

La vue regroupée par catégories, les choix mémorisés et la modération des besoins personnels ne sont pas encore disponibles.

### Champ de recherche partagé

```html
<kadi-recherche-produit (produitChoisi)="choisir($event)" />                              <!-- F2 : produits précis -->
<kadi-recherche-produit portee="liste" (produitChoisi)="choisir($event)"
                        (ajouterQuandMeme)="creerBesoin($event)" />                       <!-- F1 : Ma liste -->
```

Il interroge l'API 300 ms après la dernière touche, à partir de 2 caractères, ignore les réponses tardives d'une ancienne saisie, se pilote au clavier (flèches, Entrée, Échap) et gère les états chargement, aucun résultat, erreur avec « Réessayer » et aucun utilisateur sélectionné. `produitChoisi` émet `{ id, libelle, codeBarres }` et les compléments `marque`, `quantite`, `confiance`, `type`, `unites` ; un code-barres tapé à la main (6 à 14 chiffres) est recherché exactement. Le scan par la caméra n'est pas prévu en v0.1.0.

## Tests de bout en bout

`e2e/` contient les parcours Playwright en Python, le scénario du dossier étant joué sur ordinateur et en émulation téléphone (Pixel 7), les autres parcours sur ordinateur seulement : choix d'un profil simulé dans la liste déroulante, scénario du dossier « lait », « pâtes barilla », « coca 6 », « yaort » et saisie inconnue, fusion, confirmation de formats, modification, suppression, liste retrouvée en resélectionnant son profil, listes séparées entre Karim et Sophie, refus par l'API sans utilisateur ou avec un id inconnu (400). Ils vident la liste du profil utilisé avant chaque test et s'exécutent sur la base dédiée `kadi_e2e` : le plus simple est `back/scripts/tester-tout.ps1`, qui prépare la base, le back et le front. Pour les relancer seuls quand tout tourne déjà :

```powershell
cd e2e
.\.venv\Scripts\python.exe -m pytest -v            # ajouter --headed pour voir le navigateur
```
