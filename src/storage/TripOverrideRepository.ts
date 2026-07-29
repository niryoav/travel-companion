import type {
  DayOperationalOverrideInput,
  EventOperationalOverrideInput,
  TripOverrideBundle,
} from '../domain/trip/tripOverrides'
import type { EventId, TripDayId } from '../domain/trip/tripTypes'
import type { LocalTripOverrideMetadata } from './LocalTripOverrideMetadata'

export type TripOverrideSaveResult =
  | 'shared'
  | 'local-only'
  | 'conflict'

export type ShareSavedChangesPreparation =
  | {
      status: 'ready'
      baseRevision: number
      sharedSnapshotExists: boolean
    }
  | { status: 'unavailable' }

export interface TripOverrideRepository {
  getSnapshot(): TripOverrideBundle
  subscribe(listener: () => void): () => void
  saveDayEdits(
    dayId: TripDayId,
    dayOverride: DayOperationalOverrideInput | null,
    eventOverrides: Record<EventId, EventOperationalOverrideInput | null>,
  ): void | Promise<TripOverrideSaveResult>
  resetEvent(eventId: EventId): void | Promise<TripOverrideSaveResult>
  resetDay(
    dayId: TripDayId,
    eventIds: EventId[],
  ): void | Promise<TripOverrideSaveResult>
  getSyncMetadata?(): LocalTripOverrideMetadata
  prepareShareSavedChanges?(): Promise<ShareSavedChangesPreparation>
  shareSavedChanges?(baseRevision: number): Promise<TripOverrideSaveResult>
  retryShare?(): Promise<TripOverrideSaveResult>
}

const unavailableSnapshot: TripOverrideBundle = {
  schemaVersion: 1,
  tripId: '',
  dayOverrides: {},
  eventOverrides: {},
}

export const unavailableTripOverrideRepository: TripOverrideRepository = {
  getSnapshot: () => unavailableSnapshot,
  subscribe: () => () => {},
  saveDayEdits: () => {},
  resetEvent: () => {},
  resetDay: () => {},
}
