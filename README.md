# Kadi — front

Socle Angular de Kadi. La [charte visuelle](doc/charte-visuelle.md) constitue la référence commune pour les futures features.

## Démarrer

Prérequis : Node.js compatible avec la version d'Angular indiquée dans `package.json` et npm.

```bash
npm ci
npm start
```

Ouvrir <http://localhost:4200>. La charte vivante est sur <http://localhost:4200/charte>. Pour vérifier le projet : `npm run build` et `npm test -- --watch=false`.

## État et organisation

La page d'accueil est une vitrine de la charte. L'inscription, la vérification d'adresse et les sessions de connexion sont reliées au back ; le catalogue est consultable en lecture seule. La liste et la recherche restent à implémenter.

- `src/styles/tokens.css` : couleurs, polices, espacements, rayons, reliefs (seule source des valeurs).
- `src/styles/base.css` : reset et règles globales ; `components.css` : boutons, champs, pastilles, cartes.
- `src/app/features/accueil/` et `src/app/features/charte/` : pages existantes, chargées à la demande.
- `public/logo-kadi.png` : logo détouré (fond transparent) tiré de `Logo Kadi.png` ; `public/favicon.svg` : panier seul, en vectoriel.
- `doc/charte-visuelle.md` : intentions de design et règles d'usage.

Pour les prochaines features, créer un dossier par domaine sous `src/app/features/`, et placer les composants et services réellement partagés sous `src/app/shared/`. Ne pas créer d'abstraction ou d'endpoint hypothétique avant d'en avoir besoin. Centraliser les appels HTTP dans des services dédiés et typer les réponses à partir du contrat OpenAPI effectif, en présentant explicitement chargement, erreur et absence de données.

Le back expose l'inscription, la vérification, la connexion (`POST /api/v1/auth/connexion`), la lecture de la session (`GET /api/v1/auth/session`) et la déconnexion (`POST /api/v1/auth/deconnexion`). Le front les appelle avec CSRF et cookies sur `http://127.0.0.1:8080/api/v1`. Pour essayer le parcours, démarrer Mailpit et le back avec le profil `local` (voir le README du back), lancer `npm start`, puis ouvrir <http://127.0.0.1:4200/inscription> ou <http://127.0.0.1:4200/connexion>. Utiliser le même hôte `127.0.0.1` pour le front et l'API afin que le navigateur conserve les cookies CSRF. Les messages de vérification sont lus sur <http://127.0.0.1:8025>.

La page <http://127.0.0.1:4200/catalogue> affiche les produits déjà présents dans la base, par pages, après connexion. La barre de recherche et les cartes produit sont accompagnées d'un panneau de filtres latéral, repliable sur téléphone. Elle indique si le catalogue est vide. Pour les fiches importées, elle affiche la photo Open Food Facts disponible avec ses crédits, ou une illustration de remplacement si elle est absente ou inaccessible. La recherche propose jusqu'à sept fiches du catalogue local dès trois caractères, sans interroger Open Food Facts à chaque saisie ; lorsqu'il existe plus de résultats retenus, « Voir tous les résultats » permet de les parcourir par pages. Les filtres marque et format s'appliquent à la recherche et au parcours du catalogue local, puis réinitialisent la pagination en cours. Effacer la recherche rétablit le catalogue. Voir le README du back pour les licences et les limites de ce prototype. Les filtres de catégorie et de type, les tris avancés, un import à grande échelle et l'ajout à la liste restent à implémenter.

La marque et le format sont affichés lorsqu'ils sont renseignés et contribuent à la recherche. Ils ne sont pas inventés s'ils manquent. Cette version nécessite la migration temporaire V5 côté back ; sa mise en place et sa fusion future sont à coordonner avec l'équipe.

Le parcours du catalogue propose l'ordre initial ou le tri par nom, sans perdre les filtres ; le tri est appliqué sur l'ensemble du catalogue avant pagination. Les suggestions restent classées par pertinence. Les limites du tri et de sa pagination sont précisées dans le README du back.

Le filtre de marque propose une sélection unique dans les marques connues. Le nombre affiché compte les produits correspondant à la recherche et au format actifs, toutes pages confondues, sans appliquer la marque elle-même ; les produits sans marque renseignée ne sont pas comptés. Les limites de performance et de regroupement des marques sont décrites dans le README du back.
