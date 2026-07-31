import type {
  AddedHighTeaEventInput,
  AddedMealEventInput,
  AddedShowActivityEventInput,
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
  addMealEvent(input: AddedMealEventInput): EventId
  updateMealEvent(
    eventId: EventId,
    input: AddedMealEventInput,
  ): void
  addHighTeaEvent(input: AddedHighTeaEventInput): EventId
  updateHighTeaEvent(
    eventId: EventId,
    input: AddedHighTeaEventInput,
  ): void
  addShowActivityEvent(input: AddedShowActivityEventInput): EventId
  updateShowActivityEvent(
    eventId: EventId,
    input: AddedShowActivityEventInput,
  ): void
  removeAddedEvent(eventId: EventId): void
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
  addMealEvent: () => '',
  updateMealEvent: () => {},
  addHighTeaEvent: () => '',
  updateHighTeaEvent: () => {},
  addShowActivityEvent: () => '',
  updateShowActivityEvent: () => {},
  removeAddedEvent: () => {},
}
