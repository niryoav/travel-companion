import {
  emptyTripOverrideBundle,
  parseTripOverrideBundle,
  type AddedHighTeaEvent,
  type AddedHighTeaEventInput,
  type AddedMealEvent,
  type AddedMealEventInput,
  type DayOperationalOverrideInput,
  type EventOperationalOverrideInput,
  type TripOverrideBundle,
} from '../domain/trip/tripOverrides'
import type {
  EventId,
  MealRestaurantId,
  TripData,
  TripDayId,
} from '../domain/trip/tripTypes'
import {
  instantFromLocalTime,
  timeInputValue,
} from '../domain/trip/localTimeInput'
import {
  availableOnboardMomentTypes,
  isValidMealSelection,
} from '../domain/trip/mealPlanning'
import type { TripOverrideRepository } from './TripOverrideRepository'
import type { TripSnapshot } from '../domain/trip/tripSnapshot'
import { isValidInstant } from '../domain/trip/tripTime'
import type {
  LocalTripOverrideMetadata,
  LocalTripOverrideSyncState,
  StoredLocalTripOverrideState,
} from './LocalTripOverrideMetadata'

export function localTripOverrideStorageKey(tripId: string): string {
  return `travel-companion:trip-overrides:${tripId}`
}

export function readLocalTripOverrideBundle(
  storage: Storage,
  tripData: TripData,
): TripOverrideBundle | null {
  return readLocalTripOverrideState(storage, tripData)?.operationalOverrides ??
    null
}

function latestOverrideTimestamp(bundle: TripOverrideBundle): string | null {
  const timestamps = [
    ...Object.values(bundle.dayOverrides),
    ...Object.values(bundle.eventOverrides),
    ...Object.values(bundle.addedEvents ?? {}),
  ].map(({ updatedAt }) => updatedAt)
  return timestamps.sort().at(-1) ?? null
}

function validMetadata(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const metadata = value as Record<string, unknown>
  return (
    (
      metadata.baseRevision === null ||
      (
        Number.isInteger(metadata.baseRevision) &&
        Number(metadata.baseRevision) >= 0
      )
    ) &&
    typeof metadata.lastModified === 'string' &&
    isValidInstant(metadata.lastModified) &&
    (
      metadata.syncState === 'synced' ||
      metadata.syncState === 'unsynced' ||
      metadata.syncState === 'conflict'
    ) &&
    (
      metadata.lastSuccessfulSyncAt === undefined ||
      (
        typeof metadata.lastSuccessfulSyncAt === 'string' &&
        isValidInstant(metadata.lastSuccessfulSyncAt)
      )
    )
  )
}

export function readLocalTripOverrideState(
  storage: Storage,
  tripData: TripData,
): StoredLocalTripOverrideState | null {
  try {
    const rawValue = storage.getItem(
      localTripOverrideStorageKey(tripData.trip.id),
    )
    if (!rawValue) {
      return null
    }
    const parsed: unknown = JSON.parse(rawValue)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'storageVersion' in parsed &&
      parsed.storageVersion === 1 &&
      'tripId' in parsed &&
      parsed.tripId === tripData.trip.id &&
      'metadata' in parsed &&
      validMetadata(parsed.metadata) &&
      'operationalOverrides' in parsed
    ) {
      const operationalOverrides = parseTripOverrideBundle(
        JSON.stringify(parsed.operationalOverrides),
        tripData,
      )
      if (!operationalOverrides) {
        return null
      }
      const metadata = parsed.metadata as
        Omit<LocalTripOverrideMetadata, 'syncState'> & {
          syncState: LocalTripOverrideSyncState | 'conflict'
        }
      return {
        storageVersion: 1,
        tripId: tripData.trip.id,
        operationalOverrides,
        metadata: {
          ...metadata,
          syncState:
            metadata.syncState === 'conflict'
              ? 'unsynced'
              : metadata.syncState,
        },
      }
    }

    const legacyOverrides = parseTripOverrideBundle(rawValue, tripData)
    if (!legacyOverrides) {
      return null
    }
    return {
      storageVersion: 1,
      tripId: tripData.trip.id,
      operationalOverrides: legacyOverrides,
      metadata: {
        baseRevision: null,
        lastModified:
          latestOverrideTimestamp(legacyOverrides) ??
          tripData.publishedAt,
        syncState: 'unsynced',
      },
    }
  } catch {
    return null
  }
}

function hasValues(value: object): boolean {
  return Object.keys(value).length > 0
}

export function createUserEventId(
  existingIds: ReadonlySet<string>,
  randomUUID: () => string = () => globalThis.crypto.randomUUID(),
): EventId {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const eventId = `user-event-${randomUUID()}`
    if (!existingIds.has(eventId)) {
      return eventId
    }
  }
  throw new Error('Unable to create a unique user event ID')
}

export class LocalTripOverrideRepository
implements TripOverrideRepository {
  private readonly listeners = new Set<() => void>()
  private snapshot: TripOverrideBundle
  private metadata: LocalTripOverrideMetadata

  constructor(
    private readonly storage: Storage,
    private readonly tripData: TripData,
    private readonly now: () => Date = () => new Date(),
    initialSnapshot?: TripOverrideBundle,
    initialMetadata?: LocalTripOverrideMetadata,
    private readonly randomUUID: () => string = () =>
      globalThis.crypto.randomUUID(),
  ) {
    const storedState = readLocalTripOverrideState(
      this.storage,
      this.tripData,
    )
    const validatedInitial = initialSnapshot
      ? parseTripOverrideBundle(
          JSON.stringify(initialSnapshot),
          this.tripData,
        )
      : null
    this.snapshot =
      validatedInitial ??
      storedState?.operationalOverrides ??
      emptyTripOverrideBundle(this.tripData.trip.id)
    this.metadata =
      initialMetadata ??
      storedState?.metadata ?? {
        baseRevision: null,
        lastModified: this.tripData.publishedAt,
        syncState: 'unsynced',
      }
  }

  getSnapshot = (): TripOverrideBundle => this.snapshot

  getMetadata = (): LocalTripOverrideMetadata => this.metadata

  getSyncMetadata = (): LocalTripOverrideMetadata => this.metadata

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Replaces the validated in-memory editing baseline without persisting it. */
  replaceSnapshotForRead(
    snapshot: TripOverrideBundle,
    metadata: LocalTripOverrideMetadata = this.metadata,
  ): void {
    const validated = parseTripOverrideBundle(
      JSON.stringify(snapshot),
      this.tripData,
    )
    if (!validated) {
      throw new Error('Invalid trip override snapshot')
    }
    this.snapshot = validated
    this.metadata = metadata
    for (const listener of this.listeners) {
      listener()
    }
  }

  acceptSyncedSnapshot(snapshot: TripSnapshot): void {
    this.write(snapshot.operationalOverrides, {
      baseRevision: snapshot.revision,
      lastSuccessfulSyncAt: snapshot.updatedAt,
      lastModified: snapshot.updatedAt,
      syncState: 'synced',
    })
  }

  markSyncState(syncState: LocalTripOverrideSyncState): void {
    this.write(this.snapshot, {
      ...this.metadata,
      syncState,
    })
  }

  markUnsyncedAtBaseRevision(baseRevision: number): void {
    this.write(this.snapshot, {
      ...this.metadata,
      baseRevision,
      syncState: 'unsynced',
    })
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

    this.write(
      {
        schemaVersion: 1,
        tripId: this.tripData.trip.id,
        dayOverrides,
        eventOverrides: nextEventOverrides,
        addedEvents: this.snapshot.addedEvents ?? {},
      },
      {
        ...this.metadata,
        lastModified: updatedAt,
        syncState: 'unsynced',
      },
    )
  }

  resetEvent(eventId: EventId): void {
    if (!this.snapshot.eventOverrides[eventId]) {
      return
    }
    const eventOverrides = { ...this.snapshot.eventOverrides }
    delete eventOverrides[eventId]
    this.write(
      { ...this.snapshot, eventOverrides },
      {
        ...this.metadata,
        lastModified: this.now().toISOString(),
        syncState: 'unsynced',
      },
    )
  }

  resetDay(dayId: TripDayId, eventIds: EventId[]): void {
    const dayOverrides = { ...this.snapshot.dayOverrides }
    const eventOverrides = { ...this.snapshot.eventOverrides }
    delete dayOverrides[dayId]
    for (const eventId of eventIds) {
      delete eventOverrides[eventId]
    }
    this.write(
      { ...this.snapshot, dayOverrides, eventOverrides },
      {
        ...this.metadata,
        lastModified: this.now().toISOString(),
        syncState: 'unsynced',
      },
    )
  }

  private nextAddedEventId(): EventId {
    const existingIds = new Set([
      ...this.tripData.events.map(({ id }) => id),
      ...Object.keys(this.snapshot.addedEvents ?? {}),
    ])
    return createUserEventId(existingIds, this.randomUUID)
  }

  addMealEvent(input: AddedMealEventInput): EventId {
    const eventId = this.nextAddedEventId()
    this.saveMealEvent(eventId, input)
    return eventId
  }

  updateMealEvent(
    eventId: EventId,
    input: AddedMealEventInput,
  ): void {
    const existing = this.snapshot.addedEvents?.[eventId]
    if (!existing || existing.kind !== 'MEAL') {
      throw new Error(`User-created meal does not exist: ${eventId}`)
    }
    this.saveMealEvent(eventId, input)
  }

  addHighTeaEvent(input: AddedHighTeaEventInput): EventId {
    const eventId = this.nextAddedEventId()
    this.saveHighTeaEvent(eventId, input)
    return eventId
  }

  updateHighTeaEvent(
    eventId: EventId,
    input: AddedHighTeaEventInput,
  ): void {
    const existing = this.snapshot.addedEvents?.[eventId]
    if (!existing || existing.kind !== 'HIGH_TEA') {
      throw new Error(`User-created High Tea does not exist: ${eventId}`)
    }
    this.saveHighTeaEvent(eventId, input)
  }

  removeAddedEvent(eventId: EventId): void {
    if (!this.snapshot.addedEvents?.[eventId]) {
      return
    }
    const addedEvents = { ...this.snapshot.addedEvents }
    delete addedEvents[eventId]
    this.write(
      { ...this.snapshot, addedEvents },
      {
        ...this.metadata,
        lastModified: this.now().toISOString(),
        syncState: 'unsynced',
      },
    )
  }

  private saveMealEvent(
    eventId: EventId,
    input: AddedMealEventInput,
  ): void {
    const day = this.tripData.days.find(({ id }) => id === input.dayId)
    const restaurant = this.tripData.mealRestaurants?.find(
      ({ id }) => id === input.restaurantId,
    )
    const localTime =
      day && timeInputValue(input.startsAt, day.timeZone)
    const expectedStartsAt =
      day && localTime
        ? instantFromLocalTime(day.localDate, localTime, day.timeZone)
        : null
    if (
      !day ||
      !restaurant ||
      !localTime ||
      !expectedStartsAt ||
      Date.parse(expectedStartsAt) !== Date.parse(input.startsAt) ||
      !isValidMealSelection(
        this.tripData,
        day,
        input.mealType,
        restaurant.id,
        localTime,
      )
    ) {
      throw new Error('Meal day, restaurant, or time is unavailable')
    }
    const updatedAt = this.now().toISOString()
    const event: AddedMealEvent = {
      id: eventId,
      dayId: day.id,
      kind: 'MEAL',
      mealType: input.mealType,
      restaurantId: restaurant.id as MealRestaurantId,
      startsAt: input.startsAt,
      timeZone: day.timeZone,
      notes: input.notes?.trim() || undefined,
      updatedAt,
    }
    this.saveAddedEvent(event, updatedAt)
  }

  private saveHighTeaEvent(
    eventId: EventId,
    input: AddedHighTeaEventInput,
  ): void {
    const day = this.tripData.days.find(({ id }) => id === input.dayId)
    if (!day) {
      throw new Error('High Tea day is unavailable')
    }
    if (!availableOnboardMomentTypes(this.tripData, day).highTea) {
      throw new Error('High Tea is unavailable for this day')
    }
    if (
      Object.values(this.snapshot.addedEvents ?? {}).some(
        (event) =>
          event.kind === 'HIGH_TEA' &&
          event.dayId === day.id &&
          event.id !== eventId,
      )
    ) {
      throw new Error('High Tea already exists for this day')
    }
    const startsAt = instantFromLocalTime(
      day.localDate,
      '16:00',
      day.timeZone,
    )
    if (!startsAt) {
      throw new Error('High Tea time is unavailable')
    }
    const updatedAt = this.now().toISOString()
    const event: AddedHighTeaEvent = {
      id: eventId,
      dayId: day.id,
      kind: 'HIGH_TEA',
      startsAt,
      timeZone: day.timeZone,
      notes: input.notes?.trim() || undefined,
      updatedAt,
    }
    this.saveAddedEvent(event, updatedAt)
  }

  private saveAddedEvent(
    event: AddedMealEvent | AddedHighTeaEvent,
    updatedAt: string,
  ): void {
    const existing = this.snapshot.addedEvents ?? {}
    const addedEvents = { ...existing, [event.id]: event }
    this.write(
      { ...this.snapshot, addedEvents },
      {
        ...this.metadata,
        lastModified: updatedAt,
        syncState: 'unsynced',
      },
    )
  }

  private write(
    bundle: TripOverrideBundle,
    metadata: LocalTripOverrideMetadata,
  ): void {
    const validated = parseTripOverrideBundle(
      JSON.stringify(bundle),
      this.tripData,
    )
    if (!validated) {
      throw new Error('Invalid local trip override')
    }
    this.snapshot = validated
    this.metadata = metadata
    const storedState: StoredLocalTripOverrideState = {
      storageVersion: 1,
      tripId: this.tripData.trip.id,
      operationalOverrides: validated,
      metadata,
    }
    try {
      this.storage.setItem(
        localTripOverrideStorageKey(this.tripData.trip.id),
        JSON.stringify(storedState),
      )
    } catch {
      // The current PWA session remains usable when storage is unavailable.
    }
    for (const listener of this.listeners) {
      listener()
    }
  }
}
