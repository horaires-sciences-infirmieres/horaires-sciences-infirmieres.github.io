import {
  completeSelection,
  parseSelection,
  parseViewMode,
  viewModeValue,
  type Selection,
  type ViewMode,
} from './selection'

// Écran à afficher, déduit de l'adresse.
export type Route =
  | { screen: 'selection'; initialSelection: Partial<Selection> }
  | { screen: 'schedule'; selection: Selection; viewMode: ViewMode }

// Rangé dans l'historique avec l'adresse de l'horaire quand on y arrive depuis la sélection.
interface HistoryState {
  fromSelection: true
}

// Chemin de base du site ("/horaires-web/"), fourni par Vite d'après vite.config.ts.
const BASE_URL = import.meta.env.BASE_URL

export function readRoute(): Route {
  const params = new URLSearchParams(window.location.search)
  const initialSelection = parseSelection({
    semestre: params.get('semestre'),
    volee: params.get('volee'),
    modalite: params.get('modalite'),
    option: params.get('option'),
  })
  const selection = completeSelection(initialSelection)
  return selection
    ? { screen: 'schedule', selection, viewMode: parseViewMode(params.get('vue')) }
    : { screen: 'selection', initialSelection }
}

// Vrai si l'adresse n'a aucun paramètre.
export function hasNoParams(): boolean {
  return window.location.search === ''
}

function scheduleUrl(selection: Selection, viewMode: ViewMode): string {
  const params = new URLSearchParams({ semestre: selection.semestre, volee: selection.volee })
  if (selection.modalite) params.set('modalite', selection.modalite)
  if (selection.option) params.set('option', selection.option)
  const vue = viewModeValue(viewMode)
  if (vue) params.set('vue', vue)
  return `${BASE_URL}?${params}`
}

// "Voir l'horaire" : nouvelle entrée dans l'historique, marquée comme venant de la sélection.
export function pushScheduleUrl(selection: Selection, viewMode: ViewMode) {
  const state: HistoryState = { fromSelection: true }
  history.pushState(state, '', scheduleUrl(selection, viewMode))
}

// Arrivée sur le site avec un horaire mémorisé : remplace l'entrée actuelle.
export function replaceWithScheduleUrl(selection: Selection, viewMode: ViewMode) {
  history.replaceState(null, '', scheduleUrl(selection, viewMode))
}

// Changement de mode : met à jour l'adresse sans nouvelle entrée dans l'historique,
// en gardant l'état de l'entrée actuelle (marqueur fromSelection).
export function replaceViewModeInUrl(selection: Selection, viewMode: ViewMode) {
  history.replaceState(history.state, '', scheduleUrl(selection, viewMode))
}

export function pushSelectionUrl() {
  history.pushState(null, '', BASE_URL)
}

// Vrai si l'horaire affiché a été ouvert depuis l'écran de sélection du site.
export function cameFromSelection(): boolean {
  const state: unknown = history.state
  return (
    typeof state === 'object' &&
    state !== null &&
    (state as Partial<HistoryState>).fromSelection === true
  )
}

// Clé qui identifie une sélection, pour recréer l'écran horaire quand elle change.
// Sans le mode : changer de mode ne doit pas recréer l'écran.
export function selectionKey(selection: Selection): string {
  return scheduleUrl(selection, 'week')
}
