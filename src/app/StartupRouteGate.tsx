import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import type { TripData } from '../domain/trip/tripTypes'
import {
  hasNotificationLaunchMarker,
  withoutNotificationLaunchMarker,
} from '../features/reminders/webPushPayload'
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
  if (
    pathname === '/welcome' ||
    pathname === '/more/simulation-preview' ||
    pathname === '/documents/restaurant-menus'
  ) {
    return true
  }

  // A notification asked for this exact screen — preserve it instead of
  // redirecting to whatever selectStartupPath would otherwise pick. Checks
  // the specific, validated marker rather than "any query string," so
  // nothing else about startup routing changes.
  if (hasNotificationLaunchMarker(search)) {
    return true
  }

  const params = new URLSearchParams(search)
  return (
    params.has('state') ||
    params.has('phase') ||
    params.has('simulation')
  )
}

export function StartupRouteGate({
  children,
  tripData,
  tripStateRepository,
  now,
}: StartupRouteGateProps) {
  const location = useLocation()
  const navigate = useNavigate()
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

  // Once the preserved route has rendered, drop the marker from the visible
  // URL — cosmetic only, so it's fine to defer. Uses `replace` so it never
  // adds a history entry (back navigation from /more still leads wherever
  // it would have without the notification), and only ever touches the one
  // known, validated param — any other query string content is untouched.
  useEffect(() => {
    if (
      isInitialLocation &&
      startup.shouldPreserveLocation &&
      hasNotificationLaunchMarker(location.search)
    ) {
      navigate(
        `${location.pathname}${withoutNotificationLaunchMarker(location.search)}`,
        { replace: true },
      )
    }
  }, [
    isInitialLocation,
    location.pathname,
    location.search,
    navigate,
    startup.shouldPreserveLocation,
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
