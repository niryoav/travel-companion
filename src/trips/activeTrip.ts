import { oceaniaMarina2026DailyLoveMessages } from '../content/oceania-marina-2026/dailyLoveMessages'
import { oceaniaMarina2026TripContent } from '../content/oceania-marina-2026/tripContent'
import { oceaniaMarina2026TripData } from './oceania-marina-2026/tripData'
import type { TripConfiguration } from './tripConfiguration'

/**
 * Single switch point for the trip currently shipped by the app.
 *
 * A future trip supplies its own TripData (including ship and route), content,
 * and personal message schedule. Generic application bootstrap should not
 * import a trip-specific module directly.
 */
export const activeTripConfiguration: TripConfiguration = {
  tripData: oceaniaMarina2026TripData,
  tripContent: oceaniaMarina2026TripContent,
  dailyLoveMessages: oceaniaMarina2026DailyLoveMessages,
}
