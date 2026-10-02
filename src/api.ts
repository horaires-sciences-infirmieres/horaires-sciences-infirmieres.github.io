export const API_BASE_URL = 'https://horaires-api.fly.dev'

// La machine de l'API peut mettre 5 à 6 s à se réveiller : on laisse de la marge.
const REQUEST_TIMEOUT_MS = 20_000

export type Semestre = 'automne' | 'printemps'
export type Modalite = 'tempsPlein' | 'partiel'

export interface Cours {
  cours: string
  contenuCours: string
  volee: string
  option: string
  enseignant: string
  salle: string
  date?: string // AAAA-MM-JJ
  heureDebut?: string // HH:MM
  heureFin?: string // HH:MM
}

export interface ScheduleResponse {
  dateFichier: string | null // AAAA-MM-JJ
  cours: Cours[]
}

export type ApiErrorType = 'notAvailable' | 'server' | 'network' | 'timeout'

export class ApiError extends Error {
  readonly type: ApiErrorType

  constructor(type: ApiErrorType, message: string) {
    super(message)
    this.name = 'ApiError'
    this.type = type
  }
}

const NOT_AVAILABLE_MESSAGE = "Cet horaire n'est pas disponible pour le moment."

async function readNotFoundMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (typeof body?.message === 'string') return body.message
  } catch {
    // Corps illisible : on garde le message par défaut.
  }
  return NOT_AVAILABLE_MESSAGE
}

async function getJson<T>(path: string, params: URLSearchParams): Promise<T> {
  const url = `${API_BASE_URL}${path}?${params}`

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })

    if (response.status === 404) {
      throw new ApiError('notAvailable', await readNotFoundMessage(response))
    }
    if (!response.ok) {
      throw new ApiError(
        'server',
        `Le serveur a rencontré une erreur (code ${response.status}). Réessayez plus tard.`,
      )
    }
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError(
        'timeout',
        'Le serveur met trop de temps à répondre. Réessayez dans quelques instants.',
      )
    }
    if (error instanceof SyntaxError) {
      throw new ApiError('server', 'La réponse du serveur est illisible. Réessayez plus tard.')
    }
    throw new ApiError(
      'network',
      'Impossible de joindre le serveur. Vérifiez votre connexion internet.',
    )
  }
}

export function fetchVolees(semestre: Semestre): Promise<string[]> {
  return getJson<string[]>('/api/volees', new URLSearchParams({ semestre }))
}

export function fetchSchedule(
  semestre: Semestre,
  volee: string,
  modalites: Modalite[],
): Promise<ScheduleResponse> {
  const params = new URLSearchParams({
    semestre,
    volee,
    modalite: modalites.join(','),
  })
  return getJson<ScheduleResponse>('/api/schedule', params)
}
