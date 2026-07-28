import {
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router'

import type { TripId } from '../domain/trip/tripTypes'
import type { TripStateRepository } from '../storage/TripStateRepository'
import {
  documentRestorationTarget,
  meaningfulInternalRoute,
} from './routeRestoration'
import { TripLifecycleContext } from './TripLifecycleContext'

interface TripLifecycleProviderProps {
  activeTripId: TripId
  children: ReactNode
  tripStateRepository: TripStateRepository
}

export function TripLifecycleProvider({
  activeTripId,
  children,
  tripStateRepository,
}: TripLifecycleProviderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const currentRoute = meaningfulInternalRoute(
    location.pathname,
    location.search,
  )

  useEffect(() => {
    if (
      currentRoute &&
      tripStateRepository.getActiveTripId() === activeTripId
    ) {
      tripStateRepository.setLastMeaningfulRoute(currentRoute)
    }
  }, [activeTripId, currentRoute, tripStateRepository])

  const restoreDocumentRoute = useCallback(() => {
    const roundTrip = tripStateRepository.getDocumentRoundTrip()
    if (!roundTrip) {
      return
    }

    const target = documentRestorationTarget(
      tripStateRepository.getActiveTripId() === activeTripId,
      roundTrip,
      new Date(),
    )
    tripStateRepository.clearDocumentRoundTrip()

    if (target && target !== currentRoute) {
      navigate(target, { replace: true })
    }
  }, [
    activeTripId,
    currentRoute,
    navigate,
    tripStateRepository,
  ])

  useEffect(() => {
    const handlePageShow = () => restoreDocumentRoute()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        restoreDocumentRoute()
      }
    }

    restoreDocumentRoute()
    window.addEventListener('pageshow', handlePageShow)
    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )
    return () => {
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [restoreDocumentRoute])

  const activateTrip = useCallback(() => {
    tripStateRepository.activateTrip()
  }, [tripStateRepository])

  const recordDocumentOpen = useCallback(
    (documentId: string) => {
      const sourceRoute =
        currentRoute ??
        tripStateRepository.getLastMeaningfulRoute() ??
        '/documents'

      tripStateRepository.activateTrip()
      tripStateRepository.setLastMeaningfulRoute(sourceRoute)
      tripStateRepository.beginDocumentRoundTrip({
        originatedFromDocumentAction: true,
        sourceRoute,
        documentId,
        openedAt: new Date().toISOString(),
      })
    },
    [currentRoute, tripStateRepository],
  )

  return (
    <TripLifecycleContext.Provider
      value={{ activateTrip, recordDocumentOpen }}
    >
      {children}
    </TripLifecycleContext.Provider>
  )
}
