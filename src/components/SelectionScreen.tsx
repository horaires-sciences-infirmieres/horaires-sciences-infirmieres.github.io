import { useEffect, useState, type ReactNode } from 'react'
import { fetchVolees, type Choice, type Modalite, type Semestre, type VoleeInfo } from '../api'
import { errorState, type LoadState } from '../loadState'
import { getDefaultSemestre, type Selection } from '../selection'
import { BookIcon, CheckIcon, NotepadIcon } from './Icons'
import './SelectionScreen.css'

const SEMESTRE_OPTIONS: { value: Semestre; label: string }[] = [
  { value: 'automne', label: 'Automne' },
  { value: 'printemps', label: 'Printemps' },
]

// Source des horaires. Les examens ne sont pas encore disponibles sur le site.
type ScheduleSource = 'semester' | 'exams'

const SOURCE_OPTIONS: { value: ScheduleSource; label: string; icon: ReactNode }[] = [
  { value: 'semester', label: 'Semestre', icon: <BookIcon /> },
  { value: 'exams', label: 'Examens', icon: <NotepadIcon /> },
]

interface SelectionScreenProps {
  initialSelection: Partial<Selection>
  onSubmit: (selection: Selection) => void
}

export function SelectionScreen({ initialSelection, onSubmit }: SelectionScreenProps) {
  const [source, setSource] = useState<ScheduleSource>('semester')
  const [semestre, setSemestre] = useState<Semestre>(
    () => initialSelection.semestre ?? getDefaultSemestre(),
  )
  const [selectedVolee, setSelectedVolee] = useState<string | null>(
    initialSelection.volee ?? null,
  )
  const [selectedOption, setSelectedOption] = useState<string | null>(
    initialSelection.option ?? null,
  )
  const [selectedModalite, setSelectedModalite] = useState<Modalite | null>(
    initialSelection.modalite ?? null,
  )
  const [volees, setVolees] = useState<LoadState<VoleeInfo[]>>({ status: 'loading' })
  const [reloadCount, setReloadCount] = useState(0)

  // Recharge la liste à chaque changement de semestre ou clic sur « Réessayer ».
  // Aucun appel avec la source Examens.
  useEffect(() => {
    if (source === 'exams') return

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
  }, [semestre, reloadCount, source])

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

  // Change de volée : l'option et la modalité déjà choisies sont gardées
  // si elles existent pour la nouvelle volée, sinon effacées.
  function changeVolee(volee: string) {
    setSelectedVolee(volee)
    const info =
      volees.status === 'ok' ? volees.data.find((item) => item.volee === volee) : undefined
    if (!info?.options.some((option) => option.id === selectedOption)) setSelectedOption(null)
    if (!info?.modalites.some((modalite) => modalite.id === selectedModalite)) {
      setSelectedModalite(null)
    }
  }

  // Volée choisie, si elle figure dans la liste chargée du semestre affiché.
  const currentVolee =
    volees.status === 'ok' ? volees.data.find((item) => item.volee === selectedVolee) : undefined
  const optionChoice = resolveChoice(currentVolee?.options ?? [], selectedOption)
  const modaliteChoice = resolveChoice(currentVolee?.modalites ?? [], selectedModalite)
  // Source Semestre, et chaque section visible a un choix.
  const canSubmit =
    source === 'semester' &&
    currentVolee !== undefined &&
    optionChoice.isComplete &&
    modaliteChoice.isComplete

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
          className={
            currentVolee ? 'select-field-input select-field-input--filled' : 'select-field-input'
          }
          value={currentVolee?.volee ?? ''}
          onChange={(event) => changeVolee(event.target.value)}
        >
          <option value="" disabled>
            Choisissez votre volée
          </option>
          {volees.data.map((item) => (
            <option key={item.volee} value={item.volee}>
              {item.volee}
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
          if (currentVolee === undefined || !canSubmit) return
          onSubmit({
            semestre,
            volee: currentVolee.volee,
            modalite: modaliteChoice.value,
            option: optionChoice.value,
          })
        }}
      >
        <div className="selection-content">
          <fieldset className="selection-section">
            <legend className="selection-section-title">Source des horaires</legend>
            <div className="choice-pair">
              {SOURCE_OPTIONS.map((option) => (
                <label key={option.value} className="choice">
                  <input
                    type="radio"
                    name="source"
                    className="visually-hidden"
                    value={option.value}
                    checked={source === option.value}
                    onChange={() => setSource(option.value)}
                  />
                  {option.icon}
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

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

          {source === 'exams' ? (
            <div className="selection-section">
              <p className="selection-message" role="status">
                Les horaires d'examens ne sont pas encore disponibles sur le site.
              </p>
            </div>
          ) : (
            <>
              <div className="selection-section">
                <label htmlFor="volee-select" className="selection-section-title">
                  Volée
                </label>
                {renderVolees()}
              </div>

              {modaliteChoice.isVisible && (
                <ChoiceList
                  name="modalite"
                  legend="Modalité"
                  choices={modaliteChoice.choices}
                  value={modaliteChoice.value}
                  onChange={setSelectedModalite}
                />
              )}

              {optionChoice.isVisible && (
                <ChoiceList
                  name="option"
                  legend="Option"
                  choices={optionChoice.choices}
                  value={optionChoice.value}
                  onChange={setSelectedOption}
                />
              )}
            </>
          )}
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

interface ResolvedChoice<Id extends string> {
  choices: Choice<Id>[]
  value: Id | undefined
  isVisible: boolean
  isComplete: boolean
}

// Choix d'une section (option ou modalité) pour la volée affichée :
// aucun choix : rien ; un seul : retenu d'office, section cachée ;
// deux ou plus : section visible, choix de l'utilisateur s'il existe pour cette volée.
function resolveChoice<Id extends string>(
  choices: Choice<Id>[],
  selected: Id | null,
): ResolvedChoice<Id> {
  if (choices.length <= 1) {
    return { choices, value: choices[0]?.id, isVisible: false, isComplete: true }
  }
  const value = choices.find((choice) => choice.id === selected)?.id
  return { choices, value, isVisible: true, isComplete: value !== undefined }
}

interface ChoiceListProps<Id extends string> {
  name: string
  legend: string
  choices: Choice<Id>[]
  value: Id | undefined
  onChange: (id: Id) => void
}

// Liste à choix unique, comme les listes de l'app : un bloc arrondi,
// lignes séparées par un trait fin, coche violette sur la ligne choisie.
function ChoiceList<Id extends string>({
  name,
  legend,
  choices,
  value,
  onChange,
}: ChoiceListProps<Id>) {
  return (
    <fieldset className="selection-section">
      <legend className="selection-section-title">{legend}</legend>
      <div className="radio-list">
        {choices.map((choice) => (
          <label key={choice.id} className="radio-list-row">
            <input
              type="radio"
              name={name}
              className="visually-hidden"
              value={choice.id}
              checked={value === choice.id}
              onChange={() => onChange(choice.id)}
            />
            <span>{choice.label}</span>
            <CheckIcon className="radio-list-check" />
          </label>
        ))}
      </div>
    </fieldset>
  )
}
