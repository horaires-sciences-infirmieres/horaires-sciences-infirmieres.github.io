import { useEffect, useState } from 'react'
import { fetchSchedule, type ScheduleResponse } from './api'
import { SelectionScreen } from './components/SelectionScreen'
import { errorState, type LoadState } from './loadState'
import type { Selection } from './selection'

function App() {
  const [selection, setSelection] = useState<Selection | null>(null)
  const [isShowingSchedule, setIsShowingSchedule] = useState(false)

  if (selection !== null && isShowingSchedule) {
    return <SchedulePreview selection={selection} onEdit={() => setIsShowingSchedule(false)} />
  }

  return (
    <SelectionScreen
      initialSelection={selection}
      onSubmit={(newSelection) => {
        setSelection(newSelection)
        setIsShowingSchedule(true)
      }}
    />
  )
}

// Affichage provisoire : sera remplacé par l'écran horaire à l'étape suivante.
function SchedulePreview({ selection, onEdit }: { selection: Selection; onEdit: () => void }) {
  const [schedule, setSchedule] = useState<LoadState<ScheduleResponse>>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function loadSchedule() {
      try {
        const response = await fetchSchedule(
          selection.semestre,
          selection.volee,
          [selection.modalite],
        )
        if (!cancelled) setSchedule({ status: 'ok', data: response })
      } catch (error) {
        if (!cancelled) setSchedule(errorState(error))
      }
    }

    loadSchedule()

    return () => {
      cancelled = true
    }
  }, [selection])

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <h1>Sélection</h1>
      <ul>
        <li>Semestre : {selection.semestre}</li>
        <li>Volée : {selection.volee}</li>
        <li>Modalité : {selection.modalite}</li>
      </ul>

      {schedule.status === 'loading' && <p>Chargement...</p>}
      {schedule.status === 'error' && <p style={{ color: 'crimson' }}>{schedule.message}</p>}
      {schedule.status === 'ok' && (
        <ul>
          <li>Date du fichier : {schedule.data.dateFichier ?? 'inconnue'}</li>
          <li>Nombre de cours : {schedule.data.cours.length}</li>
        </ul>
      )}

      <button type="button" onClick={onEdit}>
        Modifier
      </button>
    </main>
  )
}

export default App
