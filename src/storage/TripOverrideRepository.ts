import type {
  AddedDinnerEventInput,
  DayOperationalOverrideInput,
  EventOperationalOverrideInput,
  TripOverrideBundle,
} from '../domain/trip/tripOverrides'
import type { EventId, TripDayId } from '../domain/trip/tripTypes'
import type { LocalTripOverrideMetadata } from './LocalTripOverrideMetadata'

export interface TripOverrideRepository {
  getSnapshot(): TripOverrideBundle
  subscribe(listener: () => void): () => void
  saveDayEdits(
    dayId: TripDayId,
    dayOverride: DayOperationalOverrideInput | null,
    eventOverrides: Record<EventId, EventOperationalOverrideInput | null>,
  ): void
  resetEvent(eventId: EventId): void
  resetDay(
    dayId: TripDayId,
    eventIds: EventId[],
  ): void
  addDinnerEvent(input: AddedDinnerEventInput): EventId
  updateDinnerEvent(
    eventId: EventId,
    input: AddedDinnerEventInput,
  ): void
  removeDinnerEvent(eventId: EventId): void
  getSyncMetadata?(): LocalTripOverrideMetadata
  synchronizeForCurrentRole?(): Promise<void>
  travelerChanged?(): void
}

const unavailableSnapshot: TripOverrideBundle = {
  schemaVersion: 1,
  tripId: '',
  dayOverrides: {},
  eventOverrides: {},
  addedEvents: {},
}

export const unavailableTripOverrideRepository: TripOverrideRepository = {
  getSnapshot: () => unavailableSnapshot,
  subscribe: () => () => {},
  saveDayEdits: () => {},
  resetEvent: () => {},
  resetDay: () => {},
  addDinnerEvent: () => '',
  updateDinnerEvent: () => {},
  removeDinnerEvent: () => {},
}
