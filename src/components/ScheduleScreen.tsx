import { useEffect, useRef, useState } from 'react'
import { fetchExams, fetchSchedule } from '../api'
import {
  addDays,
  formatFileDate,
  formatWeekRange,
  getInitialWeekStart,
  getOpeningWeekStart,
  parseDate,
  startOfWeek,
  toDateKey,
} from '../dates'
import { MODALITE_LABELS, OPTION_LABELS } from '../labels'
import { errorState, type LoadState } from '../loadState'
import { courseToItem, examToItem, type ScheduleItem } from '../scheduleItems'
import { SOURCE_TEXTS } from '../scheduleTexts'
import type { Selection, ViewMode } from '../selection'
import { DayGroup } from './DayGroup'
import { CalendarIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons'
import './ScheduleScreen.css'

// Données chargées : date du fichier et éléments (cours ou examens) prêts à afficher.
interface ScheduleData {
  dateFichier: string | null
  items: ScheduleItem[]
}

interface ScheduleScreenProps {
  selection: Selection
  viewMode: ViewMode
  onViewModeChange: (viewMode: ViewMode) => void
  onBack: () => void
}

export function ScheduleScreen({
  selection,
  viewMode,
  onViewModeChange,
  onBack,
}: ScheduleScreenProps) {
  // Date du jour, lue une seule fois à l'ouverture de l'écran (passage de minuit non géré).
  const [today] = useState(() => new Date())
  const [schedule, setSchedule] = useState<LoadState<ScheduleData>>({ status: 'loading' })
  const [reloadCount, setReloadCount] = useState(0)
  // Semaine choisie par l'étudiant (navigation, « Aujourd'hui ») ; null tant qu'il n'a pas
  // navigué : on affiche alors la semaine d'ouverture, calculée avec les données chargées.
  const [chosenWeekStart, setChosenWeekStart] = useState<Date | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const screenRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  // Défilement à faire après le prochain affichage de la liste :
  // vers le jour même à l'ouverture (instantané) ou après « Aujourd'hui » (animé),
  // ou, en mode Tout (ouverture ou bascule), vers le jour même ou le prochain jour avec
  // un élément (instantané).
  const pendingScrollRef = useRef<'opening' | 'todayButton' | 'allMode' | null>(
    viewMode === 'all' ? 'allMode' : 'opening',
  )
  const texts = SOURCE_TEXTS[selection.source]

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await loadScheduleData(selection)
        if (!cancelled) setSchedule({ status: 'ok', data })
      } catch (error) {
        if (!cancelled) setSchedule(errorState(error))
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [selection, reloadCount])

  // Ombre sous le bloc du haut dès que la page a défilé.
  useEffect(() => {
    function updateIsScrolled() {
      setIsScrolled(window.scrollY > 0)
    }

    updateIsScrolled()
    window.addEventListener('scroll', updateIsScrolled, { passive: true })

    return () => {
      window.removeEventListener('scroll', updateIsScrolled)
    }
  }, [])

  // Publie la hauteur du bloc du haut dans --schedule-top-height,
  // pour placer les en-têtes de jour collants juste en dessous.
  useEffect(() => {
    const screen = screenRef.current
    const top = topRef.current
    if (!screen || !top) return

    const observer = new ResizeObserver(() => {
      publishTopHeight(screen, top)
    })
    observer.observe(top)

    return () => {
      observer.disconnect()
    }
  }, [])

  // Après l'affichage de la liste, fait défiler jusqu'au jour demandé.
  useEffect(() => {
    const pendingScroll = pendingScrollRef.current
    const screen = screenRef.current
    const top = topRef.current
    if (pendingScroll === null || schedule.status !== 'ok' || !screen || !top) return
    pendingScrollRef.current = null

    const target =
      pendingScroll === 'allMode'
        ? findAllModeTarget(screen, today)
        : screen.querySelector(`[data-date="${toDateKey(today)}"]`)
    if (target === null) {
      // Jour cible absent de la liste affichée : on reste en haut.
      window.scrollTo(0, 0)
      return
    }

    // Hauteur à jour du bloc du haut, sans attendre le ResizeObserver.
    publishTopHeight(screen, top)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({
      block: 'start',
      behavior: pendingScroll === 'todayButton' && !prefersReducedMotion ? 'smooth' : 'auto',
    })
  }, [schedule.status, chosenWeekStart, viewMode, today])

  function retry() {
    setSchedule({ status: 'loading' })
    setReloadCount((count) => count + 1)
  }

  // Semaine précédente ou suivante : on remonte en haut, la semaine s'affiche à partir du lundi.
  function changeWeek(next: Date) {
    setChosenWeekStart(next)
    window.scrollTo(0, 0)
  }

  // « Aujourd'hui » : semaine du jour (même avant le premier élément), puis défilement
  // jusqu'au jour même une fois affichée.
  function goToToday(todayWeek: Date) {
    pendingScrollRef.current = 'todayButton'
    setChosenWeekStart(todayWeek)
  }

  // Mode Tout : défilement vers le jour même ou le prochain jour avec un élément, après
  // l'affichage. Retour au mode Semaine : semaine affichée auparavant, en haut de page.
  function toggleViewMode() {
    if (viewMode === 'week') {
      pendingScrollRef.current = 'allMode'
      onViewModeChange('all')
    } else {
      pendingScrollRef.current = null
      onViewModeChange('week')
      window.scrollTo(0, 0)
    }
  }

  function renderBanner() {
    if (schedule.status === 'loading') {
      return (
        <div className="banner-row" role="status">
          <span className="spinner" aria-hidden="true" />
          <p className="banner-secondary">
            Chargement de l'horaire…
            <br />
            Le premier chargement peut prendre quelques secondes.
          </p>
        </div>
      )
    }

    if (schedule.status === 'error') {
      if (schedule.errorType === 'notAvailable') {
        return <p className="banner-secondary">{schedule.message}</p>
      }
      return (
        <div role="alert">
          <p className="banner-secondary">{schedule.message}</p>
          <button type="button" className="secondary-button banner-retry" onClick={retry}>
            Réessayer
          </button>
        </div>
      )
    }

    const { dateFichier } = schedule.data
    return (
      <div className="banner-row">
        <CheckCircleIcon className="banner-check" />
        <p className="banner-line">
          <span className="banner-title">Horaires à jour</span>{' '}
          <span className="banner-file">
            · {dateFichier ? `Fichier du ${formatFileDate(dateFichier)}` : 'Date du fichier inconnue'}
          </span>
        </p>
      </div>
    )
  }

  function renderDays(days: WeekDay[], label: string) {
    return (
      <section className="week-days" aria-label={label}>
        {days.map((day) => (
          <DayGroup
            key={toDateKey(day.date)}
            date={day.date}
            items={day.items}
            today={today}
            texts={texts}
          />
        ))}
      </section>
    )
  }

  const itemsByDate = schedule.status === 'ok' ? groupItemsByDate(schedule.data.items) : null
  const weekStart =
    chosenWeekStart ?? getOpeningWeekStart(today, itemsByDate ? firstDate(itemsByDate) : null)
  const week = itemsByDate !== null ? buildWeek(itemsByDate, weekStart, today) : null
  const isAllMode = viewMode === 'all'
  const allDays = itemsByDate !== null && isAllMode ? getAllDays(itemsByDate) : []

  // Annoncé aux lecteurs d'écran à chaque changement de semaine ou de mode.
  let liveMessage = ''
  if (week !== null) {
    liveMessage = isAllMode
      ? `${texts.allTitle} : ${texts.count(countItems(allDays))}`
      : `Semaine du ${week.range} : ${texts.count(week.itemCount)}`
  }

  const details = formatDetails(selection)

  return (
    <div className="schedule-screen" ref={screenRef}>
      <div
        ref={topRef}
        className={isScrolled ? 'schedule-top schedule-top--scrolled' : 'schedule-top'}
      >
        <header className="schedule-bar">
          <button
            type="button"
            className="schedule-back"
            onClick={onBack}
            aria-label="Retour à la sélection"
          >
            <ChevronLeftIcon className="schedule-back-icon" />
          </button>
          <div className="schedule-bar-text">
            <h1>
              {selection.volee}
              <span className="schedule-bar-semestre">{` · ${texts.semestreLabels[selection.semestre]}`}</span>
            </h1>
            {details !== '' && <p>{details}</p>}
          </div>
          {week !== null && (
            <button
              type="button"
              className="view-toggle"
              aria-pressed={isAllMode}
              onClick={toggleViewMode}
            >
              <span className="view-toggle-pill">Tout</span>
            </button>
          )}
        </header>

        <div className="schedule-banner">{renderBanner()}</div>

        {week !== null && isAllMode && (
          <div className="all-heading">
            <h2 className="all-heading-title">{texts.allTitle}</h2>
          </div>
        )}

        {week !== null && !isAllMode && (
          <nav className="week-nav" aria-label="Navigation par semaine">
            <button
              type="button"
              className="week-nav-button"
              onClick={() => changeWeek(addDays(weekStart, -7))}
              disabled={week.isPreviousDisabled}
              aria-label="Semaine précédente"
            >
              <ChevronLeftIcon />
            </button>

            <div className="week-nav-center">
              <h2 className="week-nav-range">{week.range}</h2>
              <button
                type="button"
                className={
                  week.isTodayWeek ? 'week-nav-today week-nav-today--hidden' : 'week-nav-today'
                }
                onClick={() => goToToday(week.todayWeek)}
              >
                <span className="week-nav-today-pill">
                  <CalendarIcon />
                  Aujourd'hui
                </span>
              </button>
            </div>

            <button
              type="button"
              className="week-nav-button"
              onClick={() => changeWeek(addDays(weekStart, 7))}
              disabled={week.isNextDisabled}
              aria-label="Semaine suivante"
            >
              <ChevronRightIcon />
            </button>
          </nav>
        )}
      </div>

      {schedule.status === 'ok' && week === null && (
        <p className="schedule-empty">{texts.noItems}</p>
      )}

      {week !== null && (
        <p className="visually-hidden" aria-live="polite">
          {liveMessage}
        </p>
      )}

      {week !== null &&
        !isAllMode &&
        renderDays(week.days, `${texts.weekRegionLabel} ${week.range}`)}

      {week !== null && isAllMode && renderDays(allDays, texts.allTitle)}
    </div>
  )
}

// Charge les cours ou les examens de la sélection, convertis en éléments à afficher.
// Mêmes erreurs dans les deux cas (ApiError : 404 « notAvailable » avec le message de l'API).
async function loadScheduleData(selection: Selection): Promise<ScheduleData> {
  const { semestre, volee, modalite, option } = selection
  if (selection.source === 'exams') {
    const response = await fetchExams(semestre, volee, modalite, option)
    return { dateFichier: response.dateFichier, items: response.examens.map(examToItem) }
  }
  const response = await fetchSchedule(semestre, volee, modalite, option)
  return { dateFichier: response.dateFichier, items: response.cours.map(courseToItem) }
}

interface WeekDay {
  date: Date
  items: ScheduleItem[]
}

interface Week {
  days: WeekDay[]
  itemCount: number
  range: string
  todayWeek: Date
  isPreviousDisabled: boolean
  isNextDisabled: boolean
  isTodayWeek: boolean
}

// Calcule ce qu'il faut afficher pour la semaine ; null s'il n'y a aucun élément daté.
function buildWeek(
  itemsByDate: Map<string, ScheduleItem[]>,
  weekStart: Date,
  today: Date,
): Week | null {
  const dateKeys = [...itemsByDate.keys()].sort()
  if (dateKeys.length === 0) return null

  const firstWeek = startOfWeek(parseDate(dateKeys[0]))
  const lastWeek = startOfWeek(parseDate(dateKeys[dateKeys.length - 1]))
  const todayWeek = getInitialWeekStart(today)

  // Lundi à vendredi toujours, samedi et dimanche seulement s'ils ont des éléments.
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index)
    return { date, items: itemsByDate.get(toDateKey(date)) ?? [] }
  }).filter((day, index) => index < 5 || day.items.length > 0)

  return {
    days,
    itemCount: countItems(days),
    range: formatWeekRange(weekStart),
    todayWeek,
    isPreviousDisabled: weekStart.getTime() <= firstWeek.getTime(),
    isNextDisabled: weekStart.getTime() >= lastWeek.getTime(),
    isTodayWeek: weekStart.getTime() === todayWeek.getTime(),
  }
}

// Tous les jours qui ont des éléments, du premier au dernier.
function getAllDays(itemsByDate: Map<string, ScheduleItem[]>): WeekDay[] {
  return [...itemsByDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, items]) => ({ date: parseDate(dateKey), items }))
}

// Date du premier élément daté, ou null s'il n'y en a aucun.
function firstDate(itemsByDate: Map<string, ScheduleItem[]>): Date | null {
  const [firstKey] = [...itemsByDate.keys()].sort()
  return firstKey === undefined ? null : parseDate(firstKey)
}

// Cible du défilement en mode Tout : le premier jour affiché à partir d'aujourd'hui
// (le jour même s'il a des éléments, sinon le prochain), ou le dernier jour s'il n'y en a plus.
function findAllModeTarget(screen: HTMLElement, today: Date): Element | null {
  const todayKey = toDateKey(today)
  const days = [...screen.querySelectorAll<HTMLElement>('.day-group[data-date]')]
  return days.find((day) => (day.dataset.date ?? '') >= todayKey) ?? days.at(-1) ?? null
}

function countItems(days: WeekDay[]): number {
  return days.reduce((total, day) => total + day.items.length, 0)
}

// Regroupe les éléments datés par jour (clé AAAA-MM-JJ) et les trie par heure de début.
// Les éléments sans date sont ignorés.
function groupItemsByDate(items: ScheduleItem[]): Map<string, ScheduleItem[]> {
  const groups = new Map<string, ScheduleItem[]>()
  for (const item of items) {
    if (!item.date) continue
    const group = groups.get(item.date)
    if (group) {
      group.push(item)
    } else {
      groups.set(item.date, [item])
    }
  }
  for (const group of groups.values()) {
    group.sort(compareByStartTime)
  }
  return groups
}

// Tri par heure de début ; les éléments sans heure (travaux à rendre, horaire non précisé)
// passent en premier, comme dans le tri de l'API : c'est la date limite de la journée.
function compareByStartTime(a: ScheduleItem, b: ScheduleItem): number {
  return (a.startTime ?? '').localeCompare(b.startTime ?? '')
}

// Ligne 2 de la barre : "Temps partiel 6 semestres · Santé mentale" ; éléments absents omis.
function formatDetails(selection: Selection): string {
  const parts: string[] = []
  if (selection.modalite) parts.push(MODALITE_LABELS[selection.modalite])
  const optionLabel = selection.option ? OPTION_LABELS[selection.option] : undefined
  if (optionLabel) parts.push(optionLabel)
  return parts.join(' · ')
}

// Écrit la hauteur du bloc du haut dans --schedule-top-height.
// Arrondie au pixel supérieur : un en-tête collant passe un peu sous le bloc plutôt
// que de laisser une fente où l'on verrait défiler la liste.
function publishTopHeight(screen: HTMLElement, top: HTMLElement) {
  const height = Math.ceil(top.getBoundingClientRect().height)
  screen.style.setProperty('--schedule-top-height', `${height}px`)
}
