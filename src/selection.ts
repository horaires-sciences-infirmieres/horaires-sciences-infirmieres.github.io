import type { Modalite, Semestre } from './api'

export interface Selection {
  semestre: Semestre
  volee: string
  modalite: Modalite
}

// Janvier à août : printemps ; septembre à décembre : automne.
export function getDefaultSemestre(today: Date = new Date()): Semestre {
  // getMonth() compte les mois à partir de 0 : janvier = 0, septembre = 8.
  return today.getMonth() >= 8 ? 'automne' : 'printemps'
}
