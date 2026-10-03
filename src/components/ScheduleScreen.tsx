import { useEffect, useRef, useState } from 'react'
import {
  fetchSchedule,
  type Cours,
  type ScheduleResponse,
  type Semestre,
} from '../api'
import {
  addDays,
  formatFileDate,
  formatWeekRange,
  getInitialWeekStart,
  parseDate,
  startOfWeek,
  toDateKey,
} from '../dates'
import { MODALITE_LABELS, OPTION_LABELS } from '../labels'
import { errorState, type LoadState } from '../loadState'
import type { Selection, ViewMode } from '../selection'
import { DayGroup } from './DayGroup'
import { CalendarIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons'
import './ScheduleScreen.css'

const SEMESTRE_LABELS: Record<Semestre, string> = {
  automne: "Semestre d'automne",
  printemps: 'Semestre de printemps',
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
  const [schedule, setSchedule] = useState<LoadState<ScheduleResponse>>({ status: 'loading' })
  const [reloadCount, setReloadCount] = useState(0)
  const [weekStart, setWeekStart] = useState(() => getInitialWeekStart(today))
  const [isScrolled, setIsScrolled] = useState(false)
  const screenRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  // Défilement à faire après le prochain affichage de la liste :
  // vers le jour même à l'ouverture (instantané) ou après « Aujourd'hui » (animé),
  // ou, en mode Tout (ouverture ou bascule), vers le jour même ou le prochain jour avec
  // cours (instantané).
  const pendingScrollRef = useRef<'opening' | 'todayButton' | 'allMode' | null>(
    viewMode === 'all' ? 'allMode' : 'opening',
  )

  useEffect(() => {
    let cancelled = false

    async function loadSchedule() {
      try {
        const response = await fetchSchedule(
          selection.semestre,
          selection.volee,
          selection.modalite,
          selection.option,
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
  }, [schedule.status, weekStart, viewMode, today])

  function retry() {
    setSchedule({ status: 'loading' })
    setReloadCount((count) => count + 1)
  }

  // Semaine précédente ou suivante : on remonte en haut, la semaine s'affiche à partir du lundi.
  function changeWeek(next: Date) {
    setWeekStart(next)
    window.scrollTo(0, 0)
  }

  // « Aujourd'hui » : semaine du jour, puis défilement jusqu'au jour même une fois affichée.
  function goToToday(todayWeek: Date) {
    pendingScrollRef.current = 'todayButton'
    setWeekStart(todayWeek)
  }

  // Mode Tout : défilement vers le jour même ou le prochain jour avec cours, après l'affichage.
  // Retour au mode Semaine : semaine affichée auparavant (weekStart inchangé), en haut de page.
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
            courses={day.courses}
            today={today}
          />
        ))}
      </section>
    )
  }

  const coursesByDate = schedule.status === 'ok' ? groupCoursesByDate(schedule.data.cours) : null
  const week = coursesByDate !== null ? buildWeek(coursesByDate, weekStart, today) : null
  const isAllMode = viewMode === 'all'
  const allDays = coursesByDate !== null && isAllMode ? getAllDays(coursesByDate) : []

  // Annoncé aux lecteurs d'écran à chaque changement de semaine ou de mode.
  let liveMessage = ''
  if (week !== null) {
    liveMessage = isAllMode
      ? `Tous les cours : ${countCourses(allDays)} cours`
      : `Semaine du ${week.range} : ${week.courseCount} cours`
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
              <span className="schedule-bar-semestre">{` · ${SEMESTRE_LABELS[selection.semestre]}`}</span>
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
            <h2 className="all-heading-title">Tous les cours</h2>
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
        <p className="schedule-empty">Aucun cours trouvé pour cette volée et cette modalité.</p>
      )}

      {week !== null && (
        <p className="visually-hidden" aria-live="polite">
          {liveMessage}
        </p>
      )}

      {week !== null && !isAllMode && renderDays(week.days, `Cours de la semaine du ${week.range}`)}

      {week !== null && isAllMode && renderDays(allDays, 'Tous les cours')}
    </div>
  )
}

interface WeekDay {
  date: Date
  courses: Cours[]
}

interface Week {
  days: WeekDay[]
  courseCount: number
  range: string
  todayWeek: Date
  isPreviousDisabled: boolean
  isNextDisabled: boolean
  isTodayWeek: boolean
}

// Calcule ce qu'il faut afficher pour la semaine ; null s'il n'y a aucun cours daté.
function buildWeek(
  coursesByDate: Map<string, Cours[]>,
  weekStart: Date,
  today: Date,
): Week | null {
  const dateKeys = [...coursesByDate.keys()].sort()
  if (dateKeys.length === 0) return null

  const firstWeek = startOfWeek(parseDate(dateKeys[0]))
  const lastWeek = startOfWeek(parseDate(dateKeys[dateKeys.length - 1]))
  const todayWeek = getInitialWeekStart(today)

  // Lundi à vendredi toujours, samedi et dimanche seulement s'ils ont des cours.
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index)
    return { date, courses: coursesByDate.get(toDateKey(date)) ?? [] }
  }).filter((day, index) => index < 5 || day.courses.length > 0)

  return {
    days,
    courseCount: countCourses(days),
    range: formatWeekRange(weekStart),
    todayWeek,
    isPreviousDisabled: weekStart.getTime() <= firstWeek.getTime(),
    isNextDisabled: weekStart.getTime() >= lastWeek.getTime(),
    isTodayWeek: weekStart.getTime() === todayWeek.getTime(),
  }
}

// Tous les jours qui ont des cours, du premier au dernier.
function getAllDays(coursesByDate: Map<string, Cours[]>): WeekDay[] {
  return [...coursesByDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, courses]) => ({ date: parseDate(dateKey), courses }))
}

// Cible du défilement en mode Tout : le premier jour affiché à partir d'aujourd'hui
// (le jour même s'il a des cours, sinon le prochain), ou le dernier jour s'il n'y en a plus.
function findAllModeTarget(screen: HTMLElement, today: Date): Element | null {
  const todayKey = toDateKey(today)
  const days = [...screen.querySelectorAll<HTMLElement>('.day-group[data-date]')]
  return days.find((day) => (day.dataset.date ?? '') >= todayKey) ?? days.at(-1) ?? null
}

function countCourses(days: WeekDay[]): number {
  return days.reduce((total, day) => total + day.courses.length, 0)
}

// Regroupe les cours datés par jour (clé AAAA-MM-JJ) et les trie par heure de début.
// Les cours sans date sont ignorés.
function groupCoursesByDate(courses: Cours[]): Map<string, Cours[]> {
  const groups = new Map<string, Cours[]>()
  for (const course of courses) {
    if (!course.date) continue
    const group = groups.get(course.date)
    if (group) {
      group.push(course)
    } else {
      groups.set(course.date, [course])
    }
  }
  for (const group of groups.values()) {
    group.sort(compareByStartTime)
  }
  return groups
}

// Tri par heure de début ; les cours sans heure passent après.
function compareByStartTime(a: Cours, b: Cours): number {
  if (!a.heureDebut) return b.heureDebut ? 1 : 0
  if (!b.heureDebut) return -1
  return a.heureDebut.localeCompare(b.heureDebut)
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
