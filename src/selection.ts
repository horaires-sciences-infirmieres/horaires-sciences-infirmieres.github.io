import type { Modalite, Semestre } from './api'
import { MODALITE_LABELS, OPTION_LABELS } from './labels'

export interface Selection {
  semestre: Semestre
  volee: string
  modalite?: Modalite
  option?: string
}

const SEMESTRES: readonly Semestre[] = ['automne', 'printemps']

// Janvier à août : printemps ; septembre à décembre : automne.
export function getDefaultSemestre(today: Date = new Date()): Semestre {
  // getMonth() compte les mois à partir de 0 : janvier = 0, septembre = 8.
  return today.getMonth() >= 8 ? 'automne' : 'printemps'
}

function isSemestre(value: unknown): value is Semestre {
  return SEMESTRES.some((semestre) => semestre === value)
}

// Valeurs connues : les clés des tables de libellés.
function isModalite(value: unknown): value is Modalite {
  return typeof value === 'string' && Object.hasOwn(MODALITE_LABELS, value)
}

function isKnownOption(value: unknown): value is string {
  return typeof value === 'string' && Object.hasOwn(OPTION_LABELS, value)
}

// Garde les valeurs valides d'une sélection venue de l'extérieur (adresse, stockage).
export function parseSelection(input: Record<string, unknown>): Partial<Selection> {
  const result: Partial<Selection> = {}
  if (isSemestre(input.semestre)) result.semestre = input.semestre
  if (typeof input.volee === 'string' && input.volee.trim() !== '') result.volee = input.volee
  if (isModalite(input.modalite)) result.modalite = input.modalite
  if (isKnownOption(input.option)) result.option = input.option
  return result
}

// Sélection utilisable si le semestre et la volée sont présents, sinon null.
// La modalité et l'option sont facultatives.
export function completeSelection(partial: Partial<Selection>): Selection | null {
  const { semestre, volee, modalite, option } = partial
  if (semestre === undefined || volee === undefined) return null
  return { semestre, volee, modalite, option }
}

// Mode d'affichage de l'horaire : la semaine, ou tous les cours.
export type ViewMode = 'week' | 'all'

// Valeur du paramètre "vue" (adresse et stockage) : "tout" en mode Tout, absente sinon.
const ALL_VIEW_VALUE = 'tout'

// Valeur invalide ou absente : mode Semaine.
export function parseViewMode(value: unknown): ViewMode {
  return value === ALL_VIEW_VALUE ? 'all' : 'week'
}

export function viewModeValue(viewMode: ViewMode): string | undefined {
  return viewMode === 'all' ? ALL_VIEW_VALUE : undefined
}
