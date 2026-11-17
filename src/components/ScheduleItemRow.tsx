import { useId, useState, type ReactNode } from 'react'
import { getCourseColor } from '../courseColor'
import type { DetailKind, ScheduleItem } from '../scheduleItems'
import {
  ChevronRightIcon,
  ClockIcon,
  EyeOffIcon,
  NotepadIcon,
  PersonIcon,
  PinIcon,
  TagIcon,
  TextIcon,
} from './Icons'

// Icône de chaque élément du détail ; la couleur du cercle est dans ScheduleScreen.css.
const DETAIL_ICONS: Record<DetailKind, ReactNode> = {
  content: <TextIcon />,
  format: <NotepadIcon />,
  anonymization: <EyeOffIcon />,
  arrival: <ClockIcon />,
  teacher: <PersonIcon />,
  option: <TagIcon />,
}

interface ScheduleItemRowProps {
  item: ScheduleItem
}

// Ligne d'un cours ou d'un examen ; bouton qui ouvre le détail s'il y en a un.
export function ScheduleItemRow({ item }: ScheduleItemRowProps) {
  const [isOpen, setIsOpen] = useState(false)
  const detailId = useId()

  // Contenu de la ligne : des <span>, car un bouton ne peut pas contenir de <p>.
  const summary = (
    <>
      <span
        className="course-row-bar"
        style={{ background: getCourseColor(item.title) }}
        aria-hidden="true"
      />
      <span className="course-row-body">
        <span className="course-row-title">{item.title}</span>
        <span className="course-row-meta">
          {item.timeIcon === 'clock' ? <ClockIcon /> : <NotepadIcon />}
          {item.timeText}
        </span>
        {item.room.trim() !== '' && (
          <span className="course-row-meta">
            <PinIcon />
            {item.room}
          </span>
        )}
      </span>
    </>
  )

  if (item.details.length === 0) {
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
        {item.details.map((detail) => (
          <div key={detail.kind} className="course-detail-item">
            <span
              className={`course-detail-icon course-detail-icon--${detail.kind}`}
              aria-hidden="true"
            >
              {DETAIL_ICONS[detail.kind]}
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
