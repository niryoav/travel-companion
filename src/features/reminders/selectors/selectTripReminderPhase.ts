import type { TripData } from '../../../domain/trip/tripTypes.js'
import { selectCruiseWindow } from './selectCruiseWindow.js'

export type TripReminderPhase = 'before-trip' | 'trip-active' | 'after-trip'

/**
 * The single source of truth for "where are we relative to the cruise
 * window" — used by both the scheduler (to decide what to send) and the
 * More screen (to describe what's currently active), so they can never
 * disagree.
 */
export function selectTripReminderPhase(
  data: TripData,
  now: Date,
): TripReminderPhase {
  const window = selectCruiseWindow(data)
  if (!window) {
    return 'before-trip'
  }
  const time = now.getTime()
  if (time < Date.parse(window.startAt)) {
    return 'before-trip'
  }
  if (time > Date.parse(window.endAt)) {
    return 'after-trip'
  }
  return 'trip-active'
}
