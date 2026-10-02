import { useEffect, useState, type ReactNode } from 'react'
import { ApiError, fetchSchedule, fetchVolees, type ScheduleResponse } from './api'

// Page de test provisoire : sera remplacée par les vrais écrans.

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; message: string }

function errorState(error: unknown): { status: 'error'; message: string } {
  const message =
    error instanceof ApiError ? `${error.message} (type : ${error.type})` : 'Erreur inattendue.'
  return { status: 'error', message }
}

function Section<T>({
  title,
  state,
  render,
}: {
  title: string
  state: LoadState<T>
  render: (data: T) => ReactNode
}) {
  return (
    <section>
      <h2>{title}</h2>
      {state.status === 'loading' && <p>Chargement...</p>}
      {state.status === 'error' && <p style={{ color: 'crimson' }}>{state.message}</p>}
      {state.status === 'ok' && render(state.data)}
    </section>
  )
}

function App() {
  const [autumnVolees, setAutumnVolees] = useState<LoadState<string[]>>({ status: 'loading' })
  const [schedule, setSchedule] = useState<
    LoadState<{ volee: string; response: ScheduleResponse }>
  >({ status: 'loading' })
  const [springVolees, setSpringVolees] = useState<LoadState<string[]>>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function loadAutumn() {
      let list: string[]
      try {
        list = await fetchVolees('automne')
      } catch (error) {
        if (!cancelled) {
          setAutumnVolees(errorState(error))
          setSchedule(errorState(error))
        }
        return
      }
      if (cancelled) return
      setAutumnVolees({ status: 'ok', data: list })

      if (list.length === 0) {
        setSchedule({ status: 'error', message: 'Aucune volée disponible.' })
        return
      }
      const first = list[0]
      try {
        const response = await fetchSchedule('automne', first, ['tempsPlein', 'partiel'])
        if (!cancelled) setSchedule({ status: 'ok', data: { volee: first, response } })
      } catch (error) {
        if (!cancelled) setSchedule(errorState(error))
      }
    }

    async function loadSpring() {
      try {
        const list = await fetchVolees('printemps')
        if (!cancelled) setSpringVolees({ status: 'ok', data: list })
      } catch (error) {
        if (!cancelled) setSpringVolees(errorState(error))
      }
    }

    loadAutumn()
    loadSpring()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main style={{ padding: 16 }}>
      <h1>Test de l'API</h1>

      <Section
        title="Volées d'automne"
        state={autumnVolees}
        render={(list) => (
          <>
            <p>{list.length} volées</p>
            <ul>
              {list.map((volee) => (
                <li key={volee}>{volee}</li>
              ))}
            </ul>
          </>
        )}
      />

      <Section
        title="Première volée d'automne (temps plein + partiel)"
        state={schedule}
        render={({ volee, response }) => (
          <ul>
            <li>Volée : {volee}</li>
            <li>dateFichier : {response.dateFichier ?? 'inconnue (null)'}</li>
            <li>Nombre de cours : {response.cours.length}</li>
          </ul>
        )}
      />

      <Section
        title="Volées de printemps (erreur 404 attendue)"
        state={springVolees}
        render={(list) => (
          <p>
            {list.length} volées : {list.join(', ')}
          </p>
        )}
      />
    </main>
  )
}

export default App
