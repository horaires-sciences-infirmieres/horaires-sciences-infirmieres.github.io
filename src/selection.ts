import type { Modalite, Semestre } from './api'
import { MODALITE_LABELS, OPTION_LABELS } from './labels'

// Source des horaires : les cours du semestre, ou les examens.
export type ScheduleSource = 'courses' | 'exams'

export interface Selection {
  source: ScheduleSource
  semestre: Semestre
  volee: string
  modalite?: Modalite
  option?: string
}

const SEMESTRES: readonly Semestre[] = ['automne', 'printemps']

// Semestre présélectionné selon la date et la source :
// cours : automne de septembre à décembre, printemps de janvier à août ;
// examens : automne de septembre à février (la session d'automne a lieu en janvier-février),
// printemps de mars à août.
export function getDefaultSemestre(
  today: Date = new Date(),
  source: ScheduleSource = 'courses',
): Semestre {
  // getMonth() compte les mois à partir de 0 : janvier = 0, février = 1, septembre = 8.
  const month = today.getMonth()
  if (source === 'exams') return month >= 8 || month <= 1 ? 'automne' : 'printemps'
  return month >= 8 ? 'automne' : 'printemps'
}

// Valeur du paramètre "source" (adresse et stockage) : "examens" pour les examens,
// absente pour les cours. Toute autre valeur est ignorée.
const EXAMS_SOURCE_VALUE = 'examens'

function parseSource(value: unknown): ScheduleSource | undefined {
  return value === EXAMS_SOURCE_VALUE ? 'exams' : undefined
}

export function sourceValue(source: ScheduleSource): string | undefined {
  return source === 'exams' ? EXAMS_SOURCE_VALUE : undefined
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
  // Source absente ou invalide : pas de valeur ici (la fusion garde la source mémorisée) ;
  // « cours » est appliqué par completeSelection.
  const source = parseSource(input.source)
  if (source) result.source = source
  if (isSemestre(input.semestre)) result.semestre = input.semestre
  if (typeof input.volee === 'string' && input.volee.trim() !== '') result.volee = input.volee
  if (isModalite(input.modalite)) result.modalite = input.modalite
  if (isKnownOption(input.option)) result.option = input.option
  return result
}

// Sélection utilisable si le semestre et la volée sont présents, sinon null.
// La modalité et l'option sont facultatives ; la source vaut « cours » par défaut.
export function completeSelection(partial: Partial<Selection>): Selection | null {
  const { source, semestre, volee, modalite, option } = partial
  if (semestre === undefined || volee === undefined) return null
  return { source: source ?? 'courses', semestre, volee, modalite, option }
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
