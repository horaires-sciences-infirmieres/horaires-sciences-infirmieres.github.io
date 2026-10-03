import { useEffect, useState } from 'react'
import { ScheduleScreen } from './components/ScheduleScreen'
import { SelectionScreen } from './components/SelectionScreen'
import {
  cameFromSelection,
  hasNoParams,
  pushScheduleUrl,
  pushSelectionUrl,
  readRoute,
  replaceViewModeInUrl,
  replaceWithScheduleUrl,
  selectionKey,
  type Route,
} from './route'
import type { Selection, ViewMode } from './selection'
import { loadLastSchedule, saveLastSchedule, type LastSchedule } from './storage'

// On gère nous-mêmes le défilement : le navigateur ne restaure pas l'ancienne position au retour.
history.scrollRestoration = 'manual'

// Vrai si la page a été ouverte par une vraie navigation (adresse saisie, favori, lien,
// écran d'accueil), faux pour un rechargement ou un retour/avance dans l'historique.
// Sans information du navigateur : vrai, pour garder la redirection par défaut.
function isNewNavigation(): boolean {
  const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
  if (entry === undefined) return true
  return entry.type !== 'reload' && entry.type !== 'back_forward'
}

// Écran d'arrivée, calculé une seule fois au chargement de la page :
// à une vraie arrivée sur l'adresse sans paramètres, on reprend le dernier horaire
// mémorisé (sélection et mode). Jamais lors d'un rechargement ni d'un retour ou d'une
// avance dans l'historique.
function getArrivalRoute(lastSchedule: LastSchedule | null): Route {
  if (hasNoParams() && isNewNavigation() && lastSchedule !== null) {
    replaceWithScheduleUrl(lastSchedule.selection, lastSchedule.viewMode)
    return { screen: 'schedule', ...lastSchedule }
  }
  return readRoute()
}

// Dernier horaire mémorisé, lu une seule fois au chargement de la page.
const storedSchedule = loadLastSchedule()
const arrivalRoute = getArrivalRoute(storedSchedule)

// Choix de départ de l'écran de sélection au chargement de la page : la sélection de
// l'horaire d'arrivée, sinon la dernière sélection mémorisée (rechargement, retour,
// adresse sans paramètres ou incomplète). Les paramètres valides de l'adresse restent
// prioritaires (fusion dans le rendu de SelectionScreen).
const arrivalLastSelection =
  arrivalRoute.screen === 'schedule' ? arrivalRoute.selection : (storedSchedule?.selection ?? null)

// Mode repris par « Voir l'horaire » : celui de l'horaire d'arrivée, sinon le mode mémorisé.
const arrivalLastViewMode: ViewMode =
  arrivalRoute.screen === 'schedule' ? arrivalRoute.viewMode : (storedSchedule?.viewMode ?? 'week')

function App() {
  const [route, setRoute] = useState<Route>(arrivalRoute)
  // Dernière sélection connue : sert de choix de départ au retour à la sélection.
  const [lastSelection, setLastSelection] = useState<Selection | null>(arrivalLastSelection)
  // Dernier mode connu : repris en ouvrant un horaire depuis la sélection.
  const [lastViewMode, setLastViewMode] = useState<ViewMode>(arrivalLastViewMode)

  // Affiche l'écran correspondant à une route (l'adresse a déjà été mise à jour).
  function showRoute(next: Route) {
    setRoute(next)
    if (next.screen === 'schedule') {
      setLastSelection(next.selection)
      setLastViewMode(next.viewMode)
    }
  }

  // Boutons retour et suivant du navigateur : l'écran suit l'adresse.
  useEffect(() => {
    function handlePopState() {
      showRoute(readRoute())
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // Mémorise la sélection et le mode à chaque affichage de l'horaire et changement de mode.
  useEffect(() => {
    if (route.screen === 'schedule') saveLastSchedule(route.selection, route.viewMode)
  }, [route])

  // Titre de l'onglet.
  useEffect(() => {
    document.title =
      route.screen === 'schedule'
        ? `${route.selection.volee} · Horaires de Cours`
        : 'Horaires de Cours'
  }, [route])

  // Remonte en haut de la page à chaque changement d'écran.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route.screen])

  // « Voir l'horaire » : nouvelle sélection, avec le dernier mode connu.
  function showSchedule(selection: Selection) {
    pushScheduleUrl(selection, lastViewMode)
    showRoute({ screen: 'schedule', selection, viewMode: lastViewMode })
  }

  // Bascule Semaine / Tout : adresse remplacée, sans nouvelle entrée dans l'historique.
  function changeViewMode(viewMode: ViewMode) {
    if (route.screen !== 'schedule') return
    replaceViewModeInUrl(route.selection, viewMode)
    showRoute({ screen: 'schedule', selection: route.selection, viewMode })
  }

  function backToSelection() {
    if (cameFromSelection()) {
      // Même effet que le bouton retour du navigateur ; popstate mettra l'écran à jour.
      history.back()
      return
    }
    // Arrivé directement sur l'horaire : on reste sur le site.
    pushSelectionUrl()
    showRoute({ screen: 'selection', initialSelection: {} })
  }

  if (route.screen === 'schedule') {
    return (
      <ScheduleScreen
        key={selectionKey(route.selection)}
        selection={route.selection}
        viewMode={route.viewMode}
        onViewModeChange={changeViewMode}
        onBack={backToSelection}
      />
    )
  }

  return (
    <SelectionScreen
      initialSelection={{ ...(lastSelection ?? {}), ...route.initialSelection }}
      onSubmit={showSchedule}
    />
  )
}

export default App
