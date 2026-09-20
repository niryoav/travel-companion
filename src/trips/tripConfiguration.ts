import type { DailyLoveMessageSchedule } from '../domain/content/dailyLoveMessage'
import type { TripContentBundle } from '../domain/content/contentTypes'
import type { TripData } from '../domain/trip/tripTypes'

/**
 * Complete bundled configuration for one Travel Companion trip.
 *
 * TripData owns the operational journey facts, including the cruise ship and
 * route through its Cruise and PortCall records. Editorial content and the
 * personal daily-message schedule remain separate concerns but travel with the
 * same trip configuration at application bootstrap.
 */
export interface TripConfiguration {
  tripData: TripData
  tripContent: TripContentBundle
  dailyLoveMessages: DailyLoveMessageSchedule
}
