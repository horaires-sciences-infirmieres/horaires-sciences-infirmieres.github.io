import { formatFullDate, formatShortMonth, formatWeekday, isSameDay, toDateKey } from '../dates'
import type { ScheduleItem } from '../scheduleItems'
import type { SourceTexts } from '../scheduleTexts'
import { ScheduleItemRow } from './ScheduleItemRow'

interface DayGroupProps {
  date: Date
  items: ScheduleItem[]
  today: Date
  texts: SourceTexts
}

export function DayGroup({ date, items, today, texts }: DayGroupProps) {
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
        {items.length > 0 && (
          <span className="day-header-count">{texts.count(items.length)}</span>
        )}
      </div>

      {items.length > 0 ? (
        <ul className="course-list">
          {items.map((item, index) => (
            // La liste d'un jour ne change pas d'ordre : l'index suffit comme clé.
            <ScheduleItemRow key={index} item={item} />
          ))}
        </ul>
      ) : (
        <p className="day-empty">{texts.emptyDay}</p>
      )}
    </div>
  )
}
