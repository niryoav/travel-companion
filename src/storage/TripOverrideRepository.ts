import type {
  DayOperationalOverrideInput,
  EventOperationalOverrideInput,
  TripOverrideBundle,
} from '../domain/trip/tripOverrides'
import type { EventId, TripDayId } from '../domain/trip/tripTypes'

export interface TripOverrideRepository {
  getSnapshot(): TripOverrideBundle
  subscribe(listener: () => void): () => void
  saveDayEdits(
    dayId: TripDayId,
    dayOverride: DayOperationalOverrideInput | null,
    eventOverrides: Record<EventId, EventOperationalOverrideInput | null>,
  ): void
  resetEvent(eventId: EventId): void
  resetDay(dayId: TripDayId, eventIds: EventId[]): void
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
