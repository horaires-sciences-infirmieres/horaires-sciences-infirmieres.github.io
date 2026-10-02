import type { Modalite, Semestre } from './api'

export interface Selection {
  semestre: Semestre
  volee: string
  modalite: Modalite
}

const SEMESTRES: readonly Semestre[] = ['automne', 'printemps']
const MODALITES: readonly Modalite[] = ['tempsPlein', 'partiel']

// Janvier à août : printemps ; septembre à décembre : automne.
export function getDefaultSemestre(today: Date = new Date()): Semestre {
  // getMonth() compte les mois à partir de 0 : janvier = 0, septembre = 8.
  return today.getMonth() >= 8 ? 'automne' : 'printemps'
}

function isSemestre(value: unknown): value is Semestre {
  return SEMESTRES.some((semestre) => semestre === value)
}

function isModalite(value: unknown): value is Modalite {
  return MODALITES.some((modalite) => modalite === value)
}

// Garde les valeurs valides d'une sélection venue de l'extérieur (adresse, stockage).
export function parseSelection(input: Record<string, unknown>): Partial<Selection> {
  const result: Partial<Selection> = {}
  if (isSemestre(input.semestre)) result.semestre = input.semestre
  if (typeof input.volee === 'string' && input.volee.trim() !== '') result.volee = input.volee
  if (isModalite(input.modalite)) result.modalite = input.modalite
  return result
}

// Sélection complète si les trois valeurs sont présentes, sinon null.
export function completeSelection(partial: Partial<Selection>): Selection | null {
  const { semestre, volee, modalite } = partial
  if (semestre === undefined || volee === undefined || modalite === undefined) return null
  return { semestre, volee, modalite }
}
