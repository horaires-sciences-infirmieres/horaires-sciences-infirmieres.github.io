import { useEffect, useState } from 'react'
import { ScheduleScreen } from './components/ScheduleScreen'
import { SelectionScreen } from './components/SelectionScreen'
import type { Selection } from './selection'

function App() {
  const [selection, setSelection] = useState<Selection | null>(null)
  const [isShowingSchedule, setIsShowingSchedule] = useState(false)

  // Remonte en haut de la page à chaque changement d'écran.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [isShowingSchedule])

  if (selection !== null && isShowingSchedule) {
    return <ScheduleScreen selection={selection} onBack={() => setIsShowingSchedule(false)} />
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

export default App
