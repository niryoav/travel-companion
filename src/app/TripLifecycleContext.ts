import { createContext, useContext } from 'react'

export interface TripLifecycleContextValue {
  activateTrip(): void
  recordDocumentOpen(documentId: string): void
}

export const TripLifecycleContext =
  createContext<TripLifecycleContextValue>({
    activateTrip() {},
    recordDocumentOpen() {},
  })

export function useTripLifecycle(): TripLifecycleContextValue {
  return useContext(TripLifecycleContext)
}
