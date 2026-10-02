import { completeSelection, parseSelection, type Selection } from './selection'

// Préfixe : toutes les pages smeusling.github.io partagent le même localStorage.
const LAST_SELECTION_KEY = 'horaires-web:lastSelection'

export function loadLastSelection(): Selection | null {
  try {
    const raw = localStorage.getItem(LAST_SELECTION_KEY)
    if (raw === null) return null
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return null
    return completeSelection(parseSelection(value as Record<string, unknown>))
  } catch {
    // Stockage indisponible ou valeur illisible : comme s'il n'y avait rien.
    return null
  }
}

export function saveLastSelection(selection: Selection) {
  try {
    localStorage.setItem(LAST_SELECTION_KEY, JSON.stringify(selection))
  } catch {
    // Stockage indisponible (navigation privée, désactivé) : on continue sans mémoriser.
  }
}
