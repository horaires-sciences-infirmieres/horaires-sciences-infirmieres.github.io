import type { Modalite } from './api'

// Libellés identiques à ceux du serveur (horaires-api, src/voleeCatalog.ts).
// Ils servent aussi de liste des valeurs connues pour valider l'adresse et le stockage.

export const MODALITE_LABELS: Record<Modalite, string> = {
  tempsPlein: 'Temps plein',
  tempsPartiel: 'Temps partiel',
  tempsPartiel6: 'Temps partiel 6 semestres',
  tempsPartiel8: 'Temps partiel 8 semestres',
}

// Partial : la lecture d'une option inconnue donne undefined.
export const OPTION_LABELS: Partial<Record<string, string>> = {
  santeMentale: 'Santé mentale',
  soinsAdultes: 'Soins aux adultes',
  soinsPrimaires: 'Soins primaires',
  soinsPediatriques: 'Soins pédiatriques',
  optionClinique: 'Option clinique',
  optionRecherche: 'Option recherche',
}
