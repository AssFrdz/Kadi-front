import { MotifExclusion, NiveauDeConfiance, TypeDePreuve, UniteDePrix } from '../../core/api/prix-api';

/** Les valeurs de l'API traduites pour l'utilisateur : il ne voit jamais « ABERRANT » ni « ETIQUETTE ». */

export const NIVEAUX: Record<NiveauDeConfiance, { texte: string; points: number }> = {
  ELEVEE: { texte: 'Confiance élevée', points: 3 },
  MOYENNE: { texte: 'Confiance moyenne', points: 2 },
  FAIBLE: { texte: 'Confiance faible', points: 1 },
};

export const PREUVES: Record<TypeDePreuve, string> = {
  TICKET: 'ticket de caisse',
  EXPORT_FIDELITE: 'carte de fidélité',
  IMPORT_ENSEIGNE: "données de l'enseigne",
  ETIQUETTE: "photo d'étiquette",
  SAISIE: 'saisie',
};

export const MOTIFS: Record<MotifExclusion, string> = {
  ABERRANT: 'valeur inhabituelle, probable erreur',
  EN_PROMOTION: 'prix en promotion',
  TROP_ANCIEN: 'relevé trop ancien',
  UNITE_INCOMPATIBLE: 'autre unité',
  DOUBLON: 'doublon',
};

const UNITES: Record<UniteDePrix, string> = {
  PIECE: '',
  KILOGRAMME: ' / kg',
  LITRE: ' / L',
};

const EUROS = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

/** 1.09 → « 1,09 € » ; au kilo → « 13,96 € / kg ». */
export function prixEnEuros(prix: number, unite: UniteDePrix = 'PIECE'): string {
  return EUROS.format(prix) + UNITES[unite];
}

/** Une date ISO → « aujourd'hui », « hier », « il y a 12 jours ». */
export function ilYA(dateIso: string, maintenant: Date = new Date()): string {
  const jours = Math.floor((maintenant.getTime() - new Date(dateIso).getTime()) / 86_400_000);
  if (jours <= 0) {
    return "aujourd'hui";
  }
  return jours === 1 ? 'hier' : `il y a ${jours} jours`;
}
