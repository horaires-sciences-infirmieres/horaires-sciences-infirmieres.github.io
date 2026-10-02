import { ApiError, type ApiErrorType } from './api'

export interface ErrorState {
  status: 'error'
  message: string
  errorType: ApiErrorType | 'unknown'
}

export type LoadState<T> = { status: 'loading' } | { status: 'ok'; data: T } | ErrorState

export function errorState(error: unknown): ErrorState {
  if (error instanceof ApiError) {
    return { status: 'error', message: error.message, errorType: error.type }
  }
  return { status: 'error', message: 'Une erreur inattendue est survenue.', errorType: 'unknown' }
}
