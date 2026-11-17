import type { Cours, Examen } from './api'
import { formatTimeRange } from './dates'

// Type d'un élément du détail ; chacun a son icône (ScheduleItemRow) et sa couleur
// (ScheduleScreen.css).
export type DetailKind = 'content' | 'format' | 'anonymization' | 'arrival' | 'teacher' | 'option'

export interface ItemDetail {
  kind: DetailKind
  label: string
  value: string
}

// Élément affiché dans l'horaire, construit à partir d'un cours ou d'un examen de l'API.
export interface ScheduleItem {
  title: string
  date?: string // AAAA-MM-JJ
  startTime?: string // HH:MM, pour le tri dans la journée
  timeText: string // "09:00 - 12:00 • 3h", "Horaire non précisé" ou "À rendre"
  timeIcon: 'clock' | 'notepad'
  room: string
  details: ItemDetail[] // seulement les éléments renseignés, dans l'ordre d'affichage
}

export function courseToItem(course: Cours): ScheduleItem {
  return {
    title: course.cours,
    date: course.date,
    startTime: course.heureDebut,
    timeText: formatTimeRange(course.heureDebut, course.heureFin),
    timeIcon: 'clock',
    room: course.salle,
    details: keepFilled([
      { kind: 'content', label: 'Contenu', value: course.contenuCours },
      { kind: 'teacher', label: 'Enseignant', value: course.enseignant },
      { kind: 'option', label: 'Option', value: restrictingOption(course.option) },
    ]),
  }
}

export function examToItem(exam: Examen): ScheduleItem {
  // Sans heure : travail à rendre.
  const hasTime = Boolean(exam.heureDebut)
  return {
    title: exam.cours,
    date: exam.date,
    startTime: exam.heureDebut,
    timeText: hasTime ? formatTimeRange(exam.heureDebut, exam.heureFin) : 'À rendre',
    timeIcon: hasTime ? 'clock' : 'notepad',
    room: exam.salle,
    details: keepFilled([
      { kind: 'format', label: 'Forme', value: exam.modaliteExamen },
      { kind: 'anonymization', label: 'Anonymisation', value: exam.anonymisation },
      { kind: 'arrival', label: 'Arrivée', value: exam.heureArrivee ?? '' },
      { kind: 'teacher', label: 'Enseignant', value: exam.enseignant },
      { kind: 'option', label: 'Option', value: restrictingOption(exam.option) },
    ]),
  }
}

// « Tous » (cours) et « Toutes orientations » (examens) : l'élément concerne tout le monde,
// l'option compte donc comme vide. Casse et espaces autour ignorés.
function restrictingOption(option: string): string {
  const normalized = option.trim().toLowerCase()
  return normalized === 'tous' || normalized === 'toutes orientations' ? '' : option
}

function keepFilled(details: ItemDetail[]): ItemDetail[] {
  return details.filter((detail) => detail.value.trim() !== '')
}
