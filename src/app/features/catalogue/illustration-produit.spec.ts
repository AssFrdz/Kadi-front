import { illustrationProduit } from './illustration-produit';

describe('illustrationProduit', () => {
  it.each([
    ['Lait demi-écrémé pack 6 x 1 L', 'Lait'],
    ['Yaourt nature au lait entier 8 x 125 g', 'Produit laitier'],
    ['Coca-Cola zéro pack 6 x 33 cl', 'Boisson'],
    ['Spaghetti n°5', 'Pâtes et riz'],
    ['Haricots verts extra-fins surgelés 1 kg', 'Fruits et légumes'],
    ['Lessive liquide 2 L', 'Entretien et maison'],
  ])('range « %s » dans la famille %s', (libelle, famille) => {
    expect(illustrationProduit(libelle).famille).toBe(famille);
  });

  it('ne reconnaît que des mots entiers et se rabat sur le logo sinon', () => {
    expect(illustrationProduit('Vinaigre de cidre').famille).not.toBe('Boisson');
    expect(illustrationProduit('Gâteau marbré')).toEqual({ src: 'favicon.svg', famille: 'Produit' });
    expect(illustrationProduit('Nutella')).toEqual({ src: 'favicon.svg', famille: 'Produit' });
  });
});
