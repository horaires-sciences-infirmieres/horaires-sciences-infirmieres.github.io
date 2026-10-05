import {
  completeSelection,
  parseSelection,
  parseViewMode,
  viewModeValue,
  type Selection,
  type ViewMode,
} from './selection'

// Préfixe : évite toute collision avec d'autres données du même domaine dans localStorage.
// v2 : les sélections enregistrées avant le changement d'API sont ignorées.
const LAST_SCHEDULE_KEY = 'horaires-web:lastSelection:v2'

// Dernier horaire affiché : la sélection et le mode d'affichage.
export interface LastSchedule {
  selection: Selection
  viewMode: ViewMode
}

export function loadLastSchedule(): LastSchedule | null {
  try {
    const raw = localStorage.getItem(LAST_SCHEDULE_KEY)
    if (raw === null) return null
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return null
    const record = value as Record<string, unknown>
    const selection = completeSelection(parseSelection(record))
    if (selection === null) return null
    return { selection, viewMode: parseViewMode(record.vue) }
  } catch {
    // Stockage indisponible ou valeur illisible : comme s'il n'y avait rien.
    return null
  }
}

export function saveLastSchedule(selection: Selection, viewMode: ViewMode) {
  try {
    // "vue" absent en mode Semaine : JSON.stringify omet les valeurs undefined.
    localStorage.setItem(
      LAST_SCHEDULE_KEY,
      JSON.stringify({ ...selection, vue: viewModeValue(viewMode) }),
    )
  } catch {
    // Stockage indisponible (navigation privée, désactivé) : on continue sans mémoriser.
  }
}
