import type {
  DocumentRoundTripState,
  MeaningfulInternalRoute,
} from '../storage/TripStateRepository'

const MEANINGFUL_PATHS = new Set([
  '/home',
  '/today',
  '/trip',
  '/documents',
  '/more',
])

const REVIEW_QUERY_KEYS: Partial<Record<string, ReadonlySet<string>>> = {
  '/home': new Set(['phase']),
  '/today': new Set(['state']),
  '/trip': new Set(['state']),
}

export const DOCUMENT_RETURN_MAX_AGE_MS = 24 * 60 * 60 * 1000

export function meaningfulInternalRoute(
  pathname: string,
  search = '',
): MeaningfulInternalRoute | null {
  if (!MEANINGFUL_PATHS.has(pathname)) {
    return null
  }

  if (!search) {
    return pathname as MeaningfulInternalRoute
  }

  const allowedKeys = REVIEW_QUERY_KEYS[pathname]
  const params = new URLSearchParams(search)
  if (
    !allowedKeys ||
    [...params.keys()].some((key) => !allowedKeys.has(key))
  ) {
    return null
  }

  return `${pathname}?${params.toString()}` as MeaningfulInternalRoute
}

export function documentRestorationTarget(
  activeTripMatches: boolean,
  state: DocumentRoundTripState | null,
  now: Date,
): MeaningfulInternalRoute | null {
  if (
    !activeTripMatches ||
    !state ||
    state.originatedFromDocumentAction !== true
  ) {
    return null
  }

  const openedAt = Date.parse(state.openedAt)
  if (
    !Number.isFinite(openedAt) ||
    now.getTime() < openedAt ||
    now.getTime() - openedAt > DOCUMENT_RETURN_MAX_AGE_MS
  ) {
    return null
  }

  if (
    !state.sourceRoute.startsWith('/') ||
    state.sourceRoute.startsWith('//')
  ) {
    return '/documents'
  }

  const source = new URL(
    state.sourceRoute,
    'https://travel-companion.local',
  )
  return meaningfulInternalRoute(source.pathname, source.search) ??
    '/documents'
}
