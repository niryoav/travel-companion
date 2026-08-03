import type { EventId, TripDayId, TripId } from '../../domain/trip/tripTypes.js'

export type TripReminderKind =
  | 'prepare-for-tomorrow'
  | 'before-you-leave'
  | 'transfer'
  | 'check-in'
  | 'embarkation'
  | 'excursion'
  | 'all-aboard'

/**
 * A single, deterministic reminder derived from the trip snapshot. The same
 * snapshot, source event and rule always produce the same `id`, so delivery
 * can be deduplicated without a separate reminder data store.
 */
export interface TripReminder {
  id: string
  tripId: TripId
  sourceEntityId: TripDayId | EventId
  kind: TripReminderKind
  triggerAt: string
  timeZone: string
  title: string
  body: string
  targetPath: string
  status: 'confirmed' | 'provisional'
}
