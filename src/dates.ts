// Lecture et mise en forme des dates et heures de l'API.
// Les dates de l'API (AAAA-MM-JJ) sont lues comme des dates locales :
// new Date('AAAA-MM-JJ') les lirait en UTC, ce qui peut décaler d'un jour.

const LOCALE = 'fr-CH'

const shortDayMonthFormat = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' })
const numericDateFormat = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const shortMonthFormat = new Intl.DateTimeFormat(LOCALE, { month: 'short' })
const weekdayFormat = new Intl.DateTimeFormat(LOCALE, { weekday: 'long' })
const fullDateFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

// "2026-09-30" -> date locale du 30 septembre 2026 à minuit
export function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  // Les mois de Date commencent à 0 : janvier = 0.
  return new Date(year, month - 1, day)
}

// Date locale -> "2026-09-30", même format que l'API
export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// Ajoute des jours ; le résultat est toujours à minuit.
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b)
}

// Lundi de la semaine qui contient la date (semaine du lundi au dimanche).
export function startOfWeek(date: Date): Date {
  // getDay() : dimanche = 0, lundi = 1, …, samedi = 6.
  const daysSinceMonday = (date.getDay() + 6) % 7
  return addDays(date, -daysSinceMonday)
}

// Semaine affichée à l'ouverture : celle du jour, ou la suivante le samedi et le dimanche.
export function getInitialWeekStart(today: Date = new Date()): Date {
  const isWeekend = today.getDay() === 0 || today.getDay() === 6
  return startOfWeek(isWeekend ? addDays(today, 7) : today)
}

// "28 sept. - 4 oct."
export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6)
  return `${shortDayMonthFormat.format(weekStart)} - ${shortDayMonthFormat.format(weekEnd)}`
}

// "2026-09-30" -> "30.09.2026"
export function formatFileDate(value: string): string {
  return numericDateFormat.format(parseDate(value))
}

// "oct."
export function formatShortMonth(date: Date): string {
  return shortMonthFormat.format(date)
}

// "Lundi"
export function formatWeekday(date: Date): string {
  const name = weekdayFormat.format(date)
  return name.charAt(0).toUpperCase() + name.slice(1)
}

// "lundi 5 octobre", pour les lecteurs d'écran
export function formatFullDate(date: Date): string {
  return fullDateFormat.format(date)
}

// "09:30" -> 570 minutes depuis minuit
function parseTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

// "4h", "1h30", "45 min" ; null si la durée n'est pas un nombre positif.
export function formatDuration(start: string, end: string): string | null {
  const total = parseTime(end) - parseTime(start)
  // !(total > 0) écarte aussi NaN, si une heure est mal formée.
  if (!(total > 0)) return null
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours}h`
  return `${hours}h${String(minutes).padStart(2, '0')}`
}

// "09:00 - 13:00 • 4h", ou "Horaire non précisé"
export function formatTimeRange(start?: string, end?: string): string {
  if (!start) return 'Horaire non précisé'
  if (!end) return start
  const duration = formatDuration(start, end)
  return duration ? `${start} - ${end} • ${duration}` : `${start} - ${end}`
}
