import { useEffect, useRef, useState } from 'react'
import {
  fetchSchedule,
  type Cours,
  type Modalite,
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
import { errorState, type LoadState } from '../loadState'
import type { Selection } from '../selection'
import { DayGroup } from './DayGroup'
import { CalendarIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons'
import './ScheduleScreen.css'

const MODALITE_LABELS: Record<Modalite, string> = {
  tempsPlein: 'Temps plein',
  partiel: 'Temps partiel',
}

const SEMESTRE_LABELS: Record<Semestre, string> = {
  automne: "Semestre d'automne",
  printemps: 'Semestre de printemps',
}

interface ScheduleScreenProps {
  selection: Selection
  onBack: () => void
}

export function ScheduleScreen({ selection, onBack }: ScheduleScreenProps) {
  const [schedule, setSchedule] = useState<LoadState<ScheduleResponse>>({ status: 'loading' })
  const [reloadCount, setReloadCount] = useState(0)
  const [weekStart, setWeekStart] = useState(() => getInitialWeekStart())
  const [isScrolled, setIsScrolled] = useState(false)
  const screenRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  // Défilement vers le jour même, à faire après le prochain affichage de la semaine :
  // à l'ouverture de l'écran (instantané) ou après « Aujourd'hui » (animé).
  const pendingScrollRef = useRef<'opening' | 'todayButton' | null>('opening')

  useEffect(() => {
    let cancelled = false

    async function loadSchedule() {
      try {
        const response = await fetchSchedule(selection.semestre, selection.volee, [
          selection.modalite,
        ])
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
  // pour placer les en-têtes de jour collants juste en dessous (partie B).
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

  // Après l'affichage d'une semaine, fait défiler jusqu'au jour même si c'est demandé.
  useEffect(() => {
    const pendingScroll = pendingScrollRef.current
    const screen = screenRef.current
    const top = topRef.current
    if (pendingScroll === null || schedule.status !== 'ok' || !screen || !top) return
    pendingScrollRef.current = null

    const todayElement = screen.querySelector('.day-group--today')
    if (todayElement === null) {
      // La semaine affichée ne contient pas le jour même : on reste en haut.
      window.scrollTo(0, 0)
      return
    }

    // Hauteur à jour du bloc du haut, sans attendre le ResizeObserver.
    publishTopHeight(screen, top)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    todayElement.scrollIntoView({
      block: 'start',
      behavior: pendingScroll === 'todayButton' && !prefersReducedMotion ? 'smooth' : 'auto',
    })
  }, [schedule.status, weekStart])

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

  const week = schedule.status === 'ok' ? buildWeek(schedule.data.cours, weekStart) : null

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
            <h1>{selection.volee}</h1>
            <p>
              {MODALITE_LABELS[selection.modalite]} · {SEMESTRE_LABELS[selection.semestre]}
            </p>
          </div>
        </header>

        <div className="schedule-banner">{renderBanner()}</div>

        {week !== null && (
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
        <>
          <p className="visually-hidden" aria-live="polite">
            Semaine du {week.range} : {week.courseCount} cours
          </p>

          <section className="week-days" aria-label={`Cours de la semaine du ${week.range}`}>
            {week.days.map((day) => (
              <DayGroup key={toDateKey(day.date)} date={day.date} courses={day.courses} />
            ))}
          </section>
        </>
      )}
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
function buildWeek(courses: Cours[], weekStart: Date): Week | null {
  const coursesByDate = groupCoursesByDate(courses)
  const dateKeys = [...coursesByDate.keys()].sort()
  if (dateKeys.length === 0) return null

  const firstWeek = startOfWeek(parseDate(dateKeys[0]))
  const lastWeek = startOfWeek(parseDate(dateKeys[dateKeys.length - 1]))
  const todayWeek = getInitialWeekStart()

  // Lundi à vendredi toujours, samedi et dimanche seulement s'ils ont des cours.
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index)
    return { date, courses: coursesByDate.get(toDateKey(date)) ?? [] }
  }).filter((day, index) => index < 5 || day.courses.length > 0)

  return {
    days,
    courseCount: days.reduce((total, day) => total + day.courses.length, 0),
    range: formatWeekRange(weekStart),
    todayWeek,
    isPreviousDisabled: weekStart.getTime() <= firstWeek.getTime(),
    isNextDisabled: weekStart.getTime() >= lastWeek.getTime(),
    isTodayWeek: weekStart.getTime() === todayWeek.getTime(),
  }
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

// Écrit la hauteur du bloc du haut dans --schedule-top-height.
function publishTopHeight(screen: HTMLElement, top: HTMLElement) {
  screen.style.setProperty('--schedule-top-height', `${top.offsetHeight}px`)
}
