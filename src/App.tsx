import { useEffect, useState } from 'react'
import { ScheduleScreen } from './components/ScheduleScreen'
import { SelectionScreen } from './components/SelectionScreen'
import {
  cameFromSelection,
  hasNoParams,
  pushScheduleUrl,
  pushSelectionUrl,
  readRoute,
  replaceWithScheduleUrl,
  selectionKey,
  type Route,
} from './route'
import type { Selection } from './selection'
import { loadLastSelection, saveLastSelection } from './storage'

// On gère nous-mêmes le défilement : le navigateur ne restaure pas l'ancienne position au retour.
history.scrollRestoration = 'manual'

// Écran d'arrivée, calculé une seule fois au chargement de la page :
// sans paramètres dans l'adresse, on reprend la dernière sélection mémorisée.
function getArrivalRoute(): Route {
  if (hasNoParams()) {
    const lastSelection = loadLastSelection()
    if (lastSelection !== null) {
      replaceWithScheduleUrl(lastSelection)
      return { screen: 'schedule', selection: lastSelection }
    }
  }
  return readRoute()
}

const arrivalRoute = getArrivalRoute()

function App() {
  const [route, setRoute] = useState<Route>(arrivalRoute)
  // Dernière sélection affichée : sert de choix de départ au retour à la sélection.
  const [lastSelection, setLastSelection] = useState<Selection | null>(
    arrivalRoute.screen === 'schedule' ? arrivalRoute.selection : null,
  )

  // Affiche l'écran correspondant à une route (l'adresse a déjà été mise à jour).
  function showRoute(next: Route) {
    setRoute(next)
    if (next.screen === 'schedule') setLastSelection(next.selection)
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

  // Mémorise la sélection à chaque affichage de l'horaire.
  useEffect(() => {
    if (route.screen === 'schedule') saveLastSelection(route.selection)
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

  function showSchedule(selection: Selection) {
    pushScheduleUrl(selection)
    showRoute({ screen: 'schedule', selection })
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
