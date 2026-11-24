import { illustrationProduit } from './illustration-produit';

describe('illustrationProduit', () => {
  it.each([
    ['Lait demi-écrémé pack 6 x 1 L', 'Lait'],
    ['Yaourt nature au lait entier 8 x 125 g', 'Produit laitier'],
    ['Crème fraîche épaisse 20 cl', 'Produit laitier'],
    ['Coca-Cola zéro pack 6 x 33 cl', 'Boisson'],
    ['Eau de source 1 L', 'Boisson'],
    ['Spaghetti n°5', 'Pâtes et riz'],
    ['Haricots verts extra-fins surgelés 1 kg', 'Fruits et légumes'],
    ['Farine de blé T45 1 kg', 'Épicerie'],
    ['Lessive liquide 2 L', 'Entretien et maison'],
    ['Gobelets carton 25 cl x 50', 'Entretien et maison'],
  ])('range « %s » dans la famille %s', (libelle, famille) => {
    expect(illustrationProduit(libelle).famille).toBe(famille);
  });

  it('ne reconnaît que des mots entiers et se rabat sur le logo sinon', () => {
    expect(illustrationProduit('Vinaigre de cidre').famille).not.toBe('Boisson');
    expect(illustrationProduit('Gâteau marbré')).toEqual({ src: 'favicon.svg', famille: 'Produit' });
    expect(illustrationProduit('Nutella')).toEqual({ src: 'favicon.svg', famille: 'Produit' });
  });
});
