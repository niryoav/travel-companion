import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import type { TripData } from '../domain/trip/tripTypes'
import type { TripStateRepository } from '../storage/TripStateRepository'
import { documentRestorationTarget } from './routeRestoration'
import { selectStartupPath } from './selectStartupPath'

interface StartupRouteGateProps {
  children: ReactNode
  tripData: TripData
  tripStateRepository: TripStateRepository
  now: Date
}

function isExplicitReviewRoute(pathname: string, search: string): boolean {
  if (pathname === '/welcome') {
    return true
  }

  const params = new URLSearchParams(search)
  return params.has('state') || params.has('phase')
}

export function StartupRouteGate({
  children,
  tripData,
  tripStateRepository,
  now,
}: StartupRouteGateProps) {
  const location = useLocation()
  const [startup] = useState(() => {
    const documentTarget = documentRestorationTarget(
      tripStateRepository.getActiveTripId() === tripData.trip.id,
      tripStateRepository.getDocumentRoundTrip(),
      now,
    )

    return {
      initialLocationKey: location.key,
      documentTarget,
      shouldPreserveLocation:
        !documentTarget &&
        isExplicitReviewRoute(location.pathname, location.search),
      targetPath:
        documentTarget ?? selectStartupPath(tripData, now),
    }
  })

  const isInitialLocation = location.key === startup.initialLocationKey

  useEffect(() => {
    if (
      startup.documentTarget &&
      location.pathname + location.search === startup.documentTarget
    ) {
      tripStateRepository.clearDocumentRoundTrip()
    }
  }, [
    location.pathname,
    location.search,
    startup.documentTarget,
    tripStateRepository,
  ])

  if (
    isInitialLocation &&
    !startup.shouldPreserveLocation &&
    location.pathname !== startup.targetPath
  ) {
    return (
      <>
        <div className="startup-route-fallback" aria-hidden="true" />
        <Navigate replace to={startup.targetPath} />
      </>
    )
  }

  return children
}
