/** Illustration générique affichée quand un produit n'a pas de photo (ou que sa photo ne charge pas). */
export interface IllustrationProduit {
  /** Chemin servi depuis `public/`. */
  readonly src: string;
  /** Nom de la famille de produits, lu par les lecteurs d'écran. */
  readonly famille: string;
}

const PAR_DEFAUT: IllustrationProduit = { src: 'favicon.svg', famille: 'Produit' };

// L'ordre compte : la première famille dont un mot apparaît dans le libellé l'emporte
// (« lessive liquide » est un produit d'entretien, « yaourt au lait entier » un produit laitier).
const FAMILLES: readonly { illustration: IllustrationProduit; mots: readonly string[] }[] = [
  { illustration: { src: 'illustrations/maison.svg', famille: 'Entretien et maison' },
    mots: ['lessive', 'vaisselle', 'nettoyant', 'javel', 'papier toilette', 'essuie', 'gobelet', 'assiette', 'eponge', 'sac poubelle'] },
  { illustration: { src: 'illustrations/boisson.svg', famille: 'Boisson' },
    mots: ['coca', 'cola', 'soda', 'eau', 'jus', 'limonade', 'sirop', 'biere', 'vin', 'the glace', 'boisson'] },
  { illustration: { src: 'illustrations/laitier.svg', famille: 'Produit laitier' },
    mots: ['yaourt', 'yop', 'skyr', 'fromage', 'emmental', 'creme', 'beurre', 'dessert lacte'] },
  { illustration: { src: 'illustrations/lait.svg', famille: 'Lait' }, mots: ['lait'] },
  { illustration: { src: 'illustrations/pates.svg', famille: 'Pâtes et riz' },
    mots: ['pates', 'spaghetti', 'penne', 'fusilli', 'tagliatelle', 'coquillette', 'macaroni', 'lasagne', 'riz'] },
  { illustration: { src: 'illustrations/fruits-legumes.svg', famille: 'Fruits et légumes' },
    mots: ['haricot', 'pomme', 'poire', 'banane', 'tomate', 'carotte', 'salade', 'legume', 'fruit', 'petits pois'] },
  { illustration: { src: 'illustrations/epicerie.svg', famille: 'Épicerie' },
    mots: ['farine', 'sucre', 'sel', 'muesli', 'cereale', 'huile', 'cafe', 'chocolat', 'biscuit', 'confiture'] },
];

function normaliser(texte: string): string {
  return ` ${texte.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
}

/** Choisit l'illustration d'après les mots entiers du libellé, au singulier ou au pluriel (« vin » ≠ « vinaigre »). */
export function illustrationProduit(libelle: string): IllustrationProduit {
  const texte = normaliser(libelle);
  const famille = FAMILLES.find(({ mots }) =>
    mots.some((mot) => [` ${mot} `, ` ${mot}s `, ` ${mot}x `].some((forme) => texte.includes(forme))));
  return famille?.illustration ?? PAR_DEFAUT;
}
