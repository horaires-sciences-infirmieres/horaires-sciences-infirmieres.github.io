import { useEffect, useState } from 'react'
import { fetchVolees, type Modalite, type Semestre } from '../api'
import { errorState, type LoadState } from '../loadState'
import { getDefaultSemestre, type Selection } from '../selection'
import './SelectionScreen.css'

const SEMESTRE_OPTIONS: { value: Semestre; label: string }[] = [
  { value: 'automne', label: 'Automne' },
  { value: 'printemps', label: 'Printemps' },
]

const MODALITE_OPTIONS: { value: Modalite; label: string }[] = [
  { value: 'tempsPlein', label: 'Temps plein' },
  { value: 'partiel', label: 'Temps partiel' },
]

interface SelectionScreenProps {
  initialSelection: Selection | null
  onSubmit: (selection: Selection) => void
}

export function SelectionScreen({ initialSelection, onSubmit }: SelectionScreenProps) {
  const [semestre, setSemestre] = useState<Semestre>(
    () => initialSelection?.semestre ?? getDefaultSemestre(),
  )
  const [selectedVolee, setSelectedVolee] = useState<string | null>(
    initialSelection?.volee ?? null,
  )
  const [modalite, setModalite] = useState<Modalite>(initialSelection?.modalite ?? 'tempsPlein')
  const [volees, setVolees] = useState<LoadState<string[]>>({ status: 'loading' })
  const [reloadCount, setReloadCount] = useState(0)

  // Recharge la liste à chaque changement de semestre ou clic sur « Réessayer ».
  useEffect(() => {
    let cancelled = false

    async function loadVolees() {
      try {
        const list = await fetchVolees(semestre)
        if (!cancelled) setVolees({ status: 'ok', data: list })
      } catch (error) {
        if (!cancelled) setVolees(errorState(error))
      }
    }

    loadVolees()

    return () => {
      cancelled = true
    }
  }, [semestre, reloadCount])

  function changeSemestre(next: Semestre) {
    if (next === semestre) return
    setSemestre(next)
    // La volée choisie reste en mémoire : elle réapparaît si elle figure dans la nouvelle liste.
    setVolees({ status: 'loading' })
  }

  function retry() {
    setVolees({ status: 'loading' })
    setReloadCount((count) => count + 1)
  }

  // Volée choisie si elle figure dans la liste chargée du semestre affiché, sinon chaîne vide.
  const validVolee =
    volees.status === 'ok' && selectedVolee !== null && volees.data.includes(selectedVolee)
      ? selectedVolee
      : ''
  const canSubmit = validVolee !== ''

  function renderVolees() {
    if (volees.status === 'loading') {
      return (
        <div className="selection-status" role="status">
          <span className="spinner" aria-hidden="true" />
          <p>
            Chargement des volées…
            <br />
            Le premier chargement peut prendre quelques secondes.
          </p>
        </div>
      )
    }

    if (volees.status === 'error') {
      if (volees.errorType === 'notAvailable') {
        return <p className="selection-message">{volees.message}</p>
      }
      return (
        <div className="selection-message" role="alert">
          <p>{volees.message}</p>
          <button type="button" className="secondary-button" onClick={retry}>
            Réessayer
          </button>
        </div>
      )
    }

    if (volees.data.length === 0) {
      return <p className="selection-message">Aucune volée disponible pour ce semestre.</p>
    }

    return (
      <div className="select-field">
        <select
          id="volee-select"
          className={canSubmit ? 'select-field-input select-field-input--filled' : 'select-field-input'}
          value={validVolee}
          onChange={(event) => setSelectedVolee(event.target.value)}
        >
          <option value="" disabled>
            Choisissez votre volée
          </option>
          {volees.data.map((volee) => (
            <option key={volee} value={volee}>
              {volee}
            </option>
          ))}
        </select>
        <svg className="select-field-chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 9l6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    )
  }

  return (
    <div className="selection-screen">
      <header className="selection-header">
        <h1>Horaires de Cours</h1>
        <p>UNIL - Sciences Infirmières</p>
      </header>

      <form
        className="selection-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (canSubmit) onSubmit({ semestre, volee: validVolee, modalite })
        }}
      >
        <div className="selection-content">
          <fieldset className="selection-section">
            <legend className="selection-section-title">Semestre</legend>
            <div className="choice-pair">
              {SEMESTRE_OPTIONS.map((option) => (
                <label key={option.value} className="choice">
                  <input
                    type="radio"
                    name="semestre"
                    className="visually-hidden"
                    value={option.value}
                    checked={semestre === option.value}
                    onChange={() => changeSemestre(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="selection-section">
            <label htmlFor="volee-select" className="selection-section-title">
              Volée
            </label>
            {renderVolees()}
          </div>

          <fieldset className="selection-section">
            <legend className="selection-section-title">Modalité</legend>
            <div className="choice-pair">
              {MODALITE_OPTIONS.map((option) => (
                <label key={option.value} className="choice">
                  <input
                    type="radio"
                    name="modalite"
                    className="visually-hidden"
                    value={option.value}
                    checked={modalite === option.value}
                    onChange={() => setModalite(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="selection-footer">
          <button type="submit" className="primary-button" disabled={!canSubmit}>
            Voir l'horaire
          </button>
        </div>
      </form>
    </div>
  )
}
