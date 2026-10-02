import type { Cours } from '../api'
import { getCourseColor } from '../courseColor'
import { formatTimeRange } from '../dates'
import { ClockIcon, PinIcon } from './Icons'

interface CourseRowProps {
  course: Cours
}

export function CourseRow({ course }: CourseRowProps) {
  return (
    <li className="course-row">
      <span
        className="course-row-bar"
        style={{ background: getCourseColor(course.cours) }}
        aria-hidden="true"
      />
      <div className="course-row-body">
        <p className="course-row-title">{course.cours}</p>
        <p className="course-row-detail">
          <ClockIcon />
          {formatTimeRange(course.heureDebut, course.heureFin)}
        </p>
        {course.salle.trim() !== '' && (
          <p className="course-row-detail">
            <PinIcon />
            {course.salle}
          </p>
        )}
      </div>
    </li>
  )
}
