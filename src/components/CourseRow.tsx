import { useId, useState, type ReactNode } from 'react'
import type { Cours } from '../api'
import { getCourseColor } from '../courseColor'
import { formatTimeRange } from '../dates'
import { ChevronRightIcon, ClockIcon, PersonIcon, PinIcon, TagIcon, TextIcon } from './Icons'

interface CourseRowProps {
  course: Cours
}

export function CourseRow({ course }: CourseRowProps) {
  const [isOpen, setIsOpen] = useState(false)
  const detailId = useId()
  const details = getDetails(course)

  // Contenu de la ligne : des <span>, car un bouton ne peut pas contenir de <p>.
  const summary = (
    <>
      <span
        className="course-row-bar"
        style={{ background: getCourseColor(course.cours) }}
        aria-hidden="true"
      />
      <span className="course-row-body">
        <span className="course-row-title">{course.cours}</span>
        <span className="course-row-meta">
          <ClockIcon />
          {formatTimeRange(course.heureDebut, course.heureFin)}
        </span>
        {course.salle.trim() !== '' && (
          <span className="course-row-meta">
            <PinIcon />
            {course.salle}
          </span>
        )}
      </span>
    </>
  )

  if (details.length === 0) {
    return (
      <li>
        <div className="course-row">{summary}</div>
      </li>
    )
  }

  return (
    <li>
      <button
        type="button"
        className="course-row course-row--button"
        aria-expanded={isOpen}
        aria-controls={detailId}
        onClick={() => setIsOpen((open) => !open)}
      >
        {summary}
        <ChevronRightIcon className="course-row-chevron" />
      </button>

      <dl id={detailId} className="course-detail" hidden={!isOpen}>
        {details.map((detail) => (
          <div key={detail.kind} className="course-detail-item">
            <span
              className={`course-detail-icon course-detail-icon--${detail.kind}`}
              aria-hidden="true"
            >
              {detail.icon}
            </span>
            <div>
              <dt>{detail.label}</dt>
              <dd>{detail.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </li>
  )
}

interface CourseDetail {
  kind: 'content' | 'teacher' | 'option'
  label: string
  value: string
  icon: ReactNode
}

// Éléments du détail, dans l'ordre d'affichage ; seulement ceux qui sont renseignés.
function getDetails(course: Cours): CourseDetail[] {
  // L'option "Tous" signifie que le cours concerne tout le monde : elle compte comme vide.
  const option = course.option.trim().toLowerCase() === 'tous' ? '' : course.option
  const details: CourseDetail[] = [
    { kind: 'content', label: 'Contenu', value: course.contenuCours, icon: <TextIcon /> },
    { kind: 'teacher', label: 'Enseignant', value: course.enseignant, icon: <PersonIcon /> },
    { kind: 'option', label: 'Option', value: option, icon: <TagIcon /> },
  ]
  return details.filter((detail) => detail.value.trim() !== '')
}
