import type { TravelerId, TripId } from '../domain/trip/tripTypes'
import type {
  StoredTripState,
  TripStateRepository,
} from './TripStateRepository'

const TRIP_STATE_KEY = 'travel-companion:trip-state'
const LEGACY_TRAVELER_PROFILE_KEY = 'travel-companion:traveler-profile'

const LEGACY_TRAVELER_IDS: Record<string, TravelerId> = {
  Yoav: 'traveler-yoav',
  Isabel: 'traveler-isabel',
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
      parsed.schemaVersion === 1 &&
      'activeTripId' in parsed &&
      typeof parsed.activeTripId === 'string' &&
      (!('travelerId' in parsed) || typeof parsed.travelerId === 'string')
    ) {
      return parsed as StoredTripState
    }
  } catch {
    return null
  }

  return null
}

export class LocalTripStateRepository implements TripStateRepository {
  constructor(
    private readonly storage: Storage,
    private readonly activeTripId: TripId,
    private readonly validTravelerIds: ReadonlySet<TravelerId>,
  ) {}

  getTravelerId(): TravelerId | null {
    try {
      const state = parseStoredState(this.storage.getItem(TRIP_STATE_KEY))
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
      // The selection still applies to the current UI session.
    }
  }

  private writeState(values: Pick<StoredTripState, 'travelerId'>): void {
    const state: StoredTripState = {
      schemaVersion: 1,
      activeTripId: this.activeTripId,
      ...values,
    }
    this.storage.setItem(TRIP_STATE_KEY, JSON.stringify(state))
  }
}
