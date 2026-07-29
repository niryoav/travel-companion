import {
  emptyTripOverrideBundle,
  parseTripOverrideBundle,
  type DayOperationalOverrideInput,
  type EventOperationalOverrideInput,
  type TripOverrideBundle,
} from '../domain/trip/tripOverrides'
import type {
  EventId,
  TripData,
  TripDayId,
} from '../domain/trip/tripTypes'
import type { TripOverrideRepository } from './TripOverrideRepository'

function storageKey(tripId: string): string {
  return `travel-companion:trip-overrides:${tripId}`
}

function hasValues(value: object): boolean {
  return Object.keys(value).length > 0
}

export class LocalTripOverrideRepository
implements TripOverrideRepository {
  private readonly listeners = new Set<() => void>()
  private snapshot: TripOverrideBundle

  constructor(
    private readonly storage: Storage,
    private readonly tripData: TripData,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.snapshot =
      this.readStoredState() ??
      emptyTripOverrideBundle(this.tripData.trip.id)
  }

  getSnapshot = (): TripOverrideBundle => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  saveDayEdits(
    dayId: TripDayId,
    dayOverride: DayOperationalOverrideInput | null,
    eventOverrides: Record<
      EventId,
      EventOperationalOverrideInput | null
    >,
  ): void {
    const day = this.tripData.days.find(({ id }) => id === dayId)
    if (!day?.portCallId) {
      throw new Error(`Trip day is not editable: ${dayId}`)
    }
    for (const eventId of Object.keys(eventOverrides)) {
      const event = this.tripData.events.find(({ id }) => id === eventId)
      if (event?.dayId !== dayId || event.kind !== 'EXCURSION') {
        throw new Error(`Excursion does not belong to trip day: ${eventId}`)
      }
    }

    const updatedAt = this.now().toISOString()
    const dayOverrides = { ...this.snapshot.dayOverrides }
    const nextEventOverrides = { ...this.snapshot.eventOverrides }

    if (dayOverride && hasValues(dayOverride)) {
      dayOverrides[dayId] = { dayId, ...dayOverride, updatedAt }
    } else {
      delete dayOverrides[dayId]
    }

    for (const [eventId, override] of Object.entries(eventOverrides)) {
      if (override && hasValues(override)) {
        nextEventOverrides[eventId] = {
          eventId,
          ...override,
          updatedAt,
        }
      } else {
        delete nextEventOverrides[eventId]
      }
    }

    this.write({
      schemaVersion: 1,
      tripId: this.tripData.trip.id,
      dayOverrides,
      eventOverrides: nextEventOverrides,
    })
  }

  resetEvent(eventId: EventId): void {
    if (!this.snapshot.eventOverrides[eventId]) {
      return
    }
    const eventOverrides = { ...this.snapshot.eventOverrides }
    delete eventOverrides[eventId]
    this.write({ ...this.snapshot, eventOverrides })
  }

  resetDay(dayId: TripDayId, eventIds: EventId[]): void {
    const dayOverrides = { ...this.snapshot.dayOverrides }
    const eventOverrides = { ...this.snapshot.eventOverrides }
    delete dayOverrides[dayId]
    for (const eventId of eventIds) {
      delete eventOverrides[eventId]
    }
    this.write({ ...this.snapshot, dayOverrides, eventOverrides })
  }

  private readStoredState(): TripOverrideBundle | null {
    try {
      return parseTripOverrideBundle(
        this.storage.getItem(storageKey(this.tripData.trip.id)),
        this.tripData,
      )
    } catch {
      return null
    }
  }

  private write(bundle: TripOverrideBundle): void {
    const validated = parseTripOverrideBundle(
      JSON.stringify(bundle),
      this.tripData,
    )
    if (!validated) {
      throw new Error('Invalid local trip override')
    }
    this.snapshot = validated
    try {
      this.storage.setItem(
        storageKey(this.tripData.trip.id),
        JSON.stringify(validated),
      )
    } catch {
      // The current PWA session remains usable when storage is unavailable.
    }
    for (const listener of this.listeners) {
      listener()
    }
  }
}
