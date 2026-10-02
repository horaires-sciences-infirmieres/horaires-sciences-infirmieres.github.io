import type { Cours } from '../api'
import { formatFullDate, formatShortMonth, formatWeekday, isSameDay, toDateKey } from '../dates'
import { CourseRow } from './CourseRow'

interface DayGroupProps {
  date: Date
  courses: Cours[]
  today: Date
}

export function DayGroup({ date, courses, today }: DayGroupProps) {
  const isToday = isSameDay(date, today)

  return (
    <div className="day-group" data-date={toDateKey(date)}>
      <div className={isToday ? 'day-header day-header--today' : 'day-header'}>
        <h3 className="day-header-title">
          <span className="day-header-date" aria-hidden="true">
            <span className="day-header-month">{formatShortMonth(date)}</span>
            <span className="day-header-number">{date.getDate()}</span>
          </span>
          <span className="day-header-weekday" aria-hidden="true">
            {formatWeekday(date)}
          </span>
          <span className="visually-hidden">
            {formatFullDate(date)}
            {isToday ? ", aujourd'hui" : ''}
          </span>
        </h3>
        {courses.length > 0 && <span className="day-header-count">{courses.length} cours</span>}
      </div>

      {courses.length > 0 ? (
        <ul className="course-list">
          {courses.map((course, index) => (
            // La liste d'un jour ne change pas d'ordre : l'index suffit comme clé.
            <CourseRow key={index} course={course} />
          ))}
        </ul>
      ) : (
        <p className="day-empty">Pas de cours</p>
      )}
    </div>
  )
}
