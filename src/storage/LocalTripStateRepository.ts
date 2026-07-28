import type { TravelerId, TripId } from '../domain/trip/tripTypes'
import type {
  DocumentRoundTripState,
  MeaningfulInternalRoute,
  StoredTripState,
  TripStateRepository,
} from './TripStateRepository'

const TRIP_STATE_KEY = 'travel-companion:trip-state'
const LEGACY_TRAVELER_PROFILE_KEY = 'travel-companion:traveler-profile'

const LEGACY_TRAVELER_IDS: Record<string, TravelerId> = {
  Yoav: 'traveler-yoav',
  Isabel: 'traveler-isabel',
}

interface LegacyStoredTripState {
  schemaVersion: 1
  activeTripId: TripId
  travelerId?: TravelerId
}

function isDocumentRoundTripState(
  value: unknown,
): value is DocumentRoundTripState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'originatedFromDocumentAction' in value &&
    value.originatedFromDocumentAction === true &&
    'sourceRoute' in value &&
    typeof value.sourceRoute === 'string' &&
    'documentId' in value &&
    typeof value.documentId === 'string' &&
    'openedAt' in value &&
    typeof value.openedAt === 'string'
  )
}

function parseStoredState(value: string | null): StoredTripState | null {
  if (!value) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(value)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'schemaVersion' in parsed &&
      'activeTripId' in parsed &&
      typeof parsed.activeTripId === 'string' &&
      (!('travelerId' in parsed) || typeof parsed.travelerId === 'string')
    ) {
      if (parsed.schemaVersion === 1) {
        const legacy = parsed as LegacyStoredTripState
        return {
          schemaVersion: 2,
          activeTripId: legacy.activeTripId,
          travelerId: legacy.travelerId,
        }
      }

      if (parsed.schemaVersion === 2) {
        const state: StoredTripState = {
          schemaVersion: 2,
          activeTripId: parsed.activeTripId,
        }
        if (
          'travelerId' in parsed &&
          typeof parsed.travelerId === 'string'
        ) {
          state.travelerId = parsed.travelerId
        }
        if (
          'lastMeaningfulRoute' in parsed &&
          typeof parsed.lastMeaningfulRoute === 'string'
        ) {
          state.lastMeaningfulRoute =
            parsed.lastMeaningfulRoute as MeaningfulInternalRoute
        }
        if (
          'documentRoundTrip' in parsed &&
          isDocumentRoundTripState(parsed.documentRoundTrip)
        ) {
          state.documentRoundTrip = parsed.documentRoundTrip
        }
        return state
      }
    }
  } catch {
    return null
  }

  return null
}

export class LocalTripStateRepository implements TripStateRepository {
  private sessionState: StoredTripState | null = null

  constructor(
    private readonly storage: Storage,
    private readonly activeTripId: TripId,
    private readonly validTravelerIds: ReadonlySet<TravelerId>,
  ) {}

  getActiveTripId(): TripId | null {
    const state = this.readState()
    return state?.activeTripId === this.activeTripId
      ? state.activeTripId
      : null
  }

  activateTrip(): void {
    this.writeState({})
  }

  getTravelerId(): TravelerId | null {
    try {
      const state = this.readState()
      if (
        state?.activeTripId === this.activeTripId &&
        state.travelerId &&
        this.validTravelerIds.has(state.travelerId)
      ) {
        return state.travelerId
      }

      const legacyValue = this.storage.getItem(LEGACY_TRAVELER_PROFILE_KEY)
      const migratedTravelerId = legacyValue
        ? LEGACY_TRAVELER_IDS[legacyValue]
        : undefined

      if (
        migratedTravelerId &&
        this.validTravelerIds.has(migratedTravelerId)
      ) {
        this.writeState({ travelerId: migratedTravelerId })
        return migratedTravelerId
      }
    } catch {
      return null
    }

    return null
  }

  setTravelerId(travelerId: TravelerId): void {
    if (!this.validTravelerIds.has(travelerId)) {
      return
    }

    try {
      this.writeState({ travelerId })
    } catch {
      this.sessionState = {
        schemaVersion: 2,
        activeTripId: this.activeTripId,
        travelerId,
      }
    }
  }

  getLastMeaningfulRoute(): MeaningfulInternalRoute | null {
    const state = this.readState()
    return state?.activeTripId === this.activeTripId
      ? state.lastMeaningfulRoute ?? null
      : null
  }

  setLastMeaningfulRoute(route: MeaningfulInternalRoute): void {
    this.writeState({ lastMeaningfulRoute: route })
  }

  getDocumentRoundTrip(): DocumentRoundTripState | null {
    const state = this.readState()
    return state?.activeTripId === this.activeTripId
      ? state.documentRoundTrip ?? null
      : null
  }

  beginDocumentRoundTrip(state: DocumentRoundTripState): void {
    this.writeState({ documentRoundTrip: state })
  }

  clearDocumentRoundTrip(): void {
    const state = this.readState()
    if (!state || state.activeTripId !== this.activeTripId) {
      return
    }

    const rest = { ...state }
    delete rest.documentRoundTrip
    this.sessionState = rest
    try {
      this.storage.setItem(TRIP_STATE_KEY, JSON.stringify(rest))
    } catch {
      // Session state still prevents a stale restoration in this process.
    }
  }

  private readState(): StoredTripState | null {
    try {
      const stored = parseStoredState(this.storage.getItem(TRIP_STATE_KEY))
      if (stored) {
        this.sessionState = stored
      }
    } catch {
      // Fall back to the current in-memory session.
    }

    return this.sessionState
  }

  private writeState(
    values: Partial<Omit<StoredTripState, 'schemaVersion' | 'activeTripId'>>,
  ): void {
    const current = this.readState()
    const state: StoredTripState = {
      ...(current?.activeTripId === this.activeTripId ? current : {}),
      schemaVersion: 2,
      activeTripId: this.activeTripId,
      ...values,
    }
    this.sessionState = state
    try {
      this.storage.setItem(TRIP_STATE_KEY, JSON.stringify(state))
    } catch {
      // The state remains available for the current process.
    }
  }
}
