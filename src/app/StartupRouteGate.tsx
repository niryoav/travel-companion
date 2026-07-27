import { useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import type { TripData } from '../domain/trip/tripTypes'
import { selectStartupPath } from './selectStartupPath'

interface StartupRouteGateProps {
  children: ReactNode
  tripData: TripData
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
  now,
}: StartupRouteGateProps) {
  const location = useLocation()
  const [startup] = useState(() => ({
    initialLocationKey: location.key,
    shouldPreserveLocation: isExplicitReviewRoute(
      location.pathname,
      location.search,
    ),
    targetPath: selectStartupPath(tripData, now),
  }))

  const isInitialLocation = location.key === startup.initialLocationKey

  if (
    isInitialLocation &&
    !startup.shouldPreserveLocation &&
    location.pathname !== startup.targetPath
  ) {
    return <Navigate replace to={startup.targetPath} />
  }

  return children
}
