import { completeSelection, parseSelection, type Selection } from './selection'

// Écran à afficher, déduit de l'adresse.
export type Route =
  | { screen: 'selection'; initialSelection: Partial<Selection> }
  | { screen: 'schedule'; selection: Selection }

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
  })
  const selection = completeSelection(initialSelection)
  return selection
    ? { screen: 'schedule', selection }
    : { screen: 'selection', initialSelection }
}

// Vrai si l'adresse n'a aucun paramètre.
export function hasNoParams(): boolean {
  return window.location.search === ''
}

function scheduleUrl(selection: Selection): string {
  const params = new URLSearchParams({
    semestre: selection.semestre,
    volee: selection.volee,
    modalite: selection.modalite,
  })
  return `${BASE_URL}?${params}`
}

// "Voir l'horaire" : nouvelle entrée dans l'historique, marquée comme venant de la sélection.
export function pushScheduleUrl(selection: Selection) {
  const state: HistoryState = { fromSelection: true }
  history.pushState(state, '', scheduleUrl(selection))
}

// Arrivée sur le site avec une sélection mémorisée : remplace l'entrée actuelle.
export function replaceWithScheduleUrl(selection: Selection) {
  history.replaceState(null, '', scheduleUrl(selection))
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
export function selectionKey(selection: Selection): string {
  return scheduleUrl(selection)
}
