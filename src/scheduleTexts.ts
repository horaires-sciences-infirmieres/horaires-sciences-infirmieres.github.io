import type { Semestre } from './api'
import type { ScheduleSource } from './selection'

// Textes de l'écran horaire qui dépendent de la source (cours ou examens).
export interface SourceTexts {
  semestreLabels: Record<Semestre, string> // ligne 1 de la barre, après la volée
  allTitle: string // titre du mode Tout
  emptyDay: string // jour de semaine sans élément
  noItems: string // aucun élément daté pour la sélection
  weekRegionLabel: string // nom de la liste de la semaine, suivi de la période
  count: (count: number) => string // pastille d'un jour et annonces aux lecteurs d'écran
}

export const SOURCE_TEXTS: Record<ScheduleSource, SourceTexts> = {
  courses: {
    semestreLabels: { automne: "Semestre d'automne", printemps: 'Semestre de printemps' },
    allTitle: 'Tous les cours',
    emptyDay: 'Pas de cours',
    noItems: 'Aucun cours trouvé pour cette volée et cette modalité.',
    weekRegionLabel: 'Cours de la semaine du',
    count: (count) => `${count} cours`,
  },
  exams: {
    semestreLabels: { automne: "Examens d'automne", printemps: 'Examens de printemps' },
    allTitle: 'Tous les examens',
    emptyDay: "Pas d'examen",
    noItems: 'Aucun examen pour cette sélection dans ce fichier.',
    weekRegionLabel: 'Examens de la semaine du',
    count: (count) => (count === 1 ? '1 examen' : `${count} examens`),
  },
}
