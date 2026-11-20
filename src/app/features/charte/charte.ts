import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Couleur {
  nom: string;
  jeton: string;
  hex: string;
  role: string;
  clair?: boolean;
}

@Component({
  selector: 'kadi-charte',
  imports: [RouterLink],
  templateUrl: './charte.html',
  styleUrl: './charte.css',
})
export class Charte {
  protected readonly couleurs: Couleur[] = [
    { nom: 'Forêt', jeton: '--foret', hex: '#0C3D26', role: 'Texte, traits, ombres pleines' },
    { nom: 'Panier', jeton: '--panier', hex: '#1E6E41', role: 'Actions principales' },
    { nom: 'Feuille', jeton: '--feuille', hex: '#86C92F', role: 'Détail décoratif uniquement', clair: true },
    { nom: 'Menthe', jeton: '--menthe', hex: '#BDE2B3', role: 'Grands aplats de marque', clair: true },
    { nom: 'Papier', jeton: '--papier', hex: '#F5F0E4', role: 'Fond des écrans', clair: true },
    { nom: 'Blanc cassé', jeton: '--blanc', hex: '#FFFDF7', role: 'Cartes et champs', clair: true },
    { nom: 'Beurre', jeton: '--beurre', hex: '#F7DD72', role: 'Surlignage, repère, survol', clair: true },
    { nom: 'Tomate', jeton: '--tomate', hex: '#E8553B', role: 'Alerte et suppression' },
  ];

  protected readonly espaces = [4, 8, 12, 16, 24, 32, 48, 72];

  protected readonly regles = [
    'On consomme les variables de tokens.css. Aucune couleur, aucun rayon ni espacement écrit en dur dans une feature.',
    'Une seule action principale par zone. Le reste passe en bouton secondaire.',
    'Le feutre beurre et les accents tomate restent rares : un par écran, rarement plus.',
    'On pense mobile d’abord, à partir de 320 px, avec des cibles tactiles d’au moins 44 px.',
    'Un état vide, une erreur et un chargement se dessinent aussi soigneusement que l’écran rempli.',
    'On écrit comme on parle à quelqu’un : vouvoiement, mots simples, aucune promesse que les données ne prouvent pas.',
  ];
}
