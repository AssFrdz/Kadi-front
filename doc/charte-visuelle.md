# Charte visuelle Kadi

La référence visuelle vivante est la page `/charte` de l'application. Ce document en donne l'intention ; les valeurs exactes sont dans `src/styles/tokens.css`.

## Intention

**Le carnet de courses.** Une interface chaleureuse et franche, comme un ticket de caisse bien tenu : papier crème, traits épais couleur forêt, ombres pleines façon autocollant, lettres rondes comme celles du logo. Pas de dégradés, d'ombres floues, de verre dépoli ni de grille de cartes identiques : chaque écran garde un point de vue.

Aucune maquette Dribbble n'a pu être consultée (le site n'est pas accessible automatiquement) ; la direction s'appuie sur le logo et sur les codes courants des applications de courses : aplats francs, formes rondes, détails tactiles.

## Logo

Source : `Logo Kadi.png`. Version d'usage : `public/logo-kadi.png` (détourée, sans signature). Utilisation sur papier, blanc cassé ou menthe uniquement. Ni déformation, ni recoloration, ni ombre. Une version vectorielle fournie par la personne qui a dessiné le logo remplacerait avantageusement le PNG.

## Couleurs

Verts du logo (`--foret`, `--panier`, `--feuille`, `--menthe`), papier chaud (`--papier`, `--blanc`), et deux accents rares : `--beurre` (surlignage, repère) et `--tomate` (alerte). Valeurs approchées à partir du PNG, à confirmer avec la personne qui a créé le logo. Proportions visées : papier 60 %, verts 25 %, menthe 10 %, accents 5 %.

Le texte courant utilise `--encre` ou `--encre-douce` (contrastes de 5,4:1 ou plus sur le papier). `--feuille` et `--beurre` ne portent jamais de texte clair, et `--tomate` ne porte pas de texte : l'alerte utilise `--tomate-claire` avec `--erreur`.

## Typographie

- **Fredoka** (titres, boutons, chiffres mis en avant) : proche de la rondeur du logo.
- **Instrument Sans** (texte courant) : sobre, pour laisser la place aux produits.
- **DM Mono** (détails de ticket : références, formats) : jamais pour un paragraphe.

Polices auto-hébergées via `@fontsource`, sans appel à un service externe.

## Formes, relief, mouvement

Trait de 2 px en `--foret`, rayons 10 / 18 / 32 px ou pilule, ombre pleine décalée de 4 à 6 px sans flou. Un bouton s'enfonce au clic. Les mouvements restent brefs et désactivés quand l'utilisateur demande moins d'animation.

## Règles d'équipe

1. Consommer les variables de `tokens.css` ; aucune valeur de design en dur dans une feature.
2. Un seul bouton principal par zone.
3. Surlignage beurre (`.feutre`) et accents tomate : un par écran, rarement plus.
4. Mobile d'abord (320 px), cibles tactiles d'au moins 44 px, focus visible, contrastes AA.
5. Concevoir aussi les états vide, erreur et chargement.
6. Écrire en français naturel, vouvoiement, sans promesse que les données ne prouvent pas.

## F1 : points d'attention pour plus tard

La fiche back prime sur toute maquette. Recherche à partir de trois caractères, jusqu'à sept suggestions, choix toujours explicite ; distinguer « Référence non précisée », produit précis et besoin personnalisé ; séparer format et quantité (quantité en fin de ligne) ; section « Autre » en vue groupée ; filtres incompatibles et recherche sans résultat expliqués ; ne pas afficher de prix dans la construction de liste. Rien de cela n'est encore implémenté.
