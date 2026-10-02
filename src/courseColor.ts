const COURSE_COLORS = [
  'var(--color-course-1)',
  'var(--color-course-2)',
  'var(--color-course-3)',
  'var(--color-course-4)',
  'var(--color-course-5)',
  'var(--color-course-6)',
]

// Hachage djb2 : simple et déterministe, le même nom donne toujours la même couleur.
export function getCourseColor(name: string): string {
  let hash = 5381
  for (let index = 0; index < name.length; index++) {
    // >>> 0 garde un entier positif sur 32 bits.
    hash = (hash * 33 + name.charCodeAt(index)) >>> 0
  }
  return COURSE_COLORS[hash % COURSE_COLORS.length]
}
