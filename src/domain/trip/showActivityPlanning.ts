import { onboardMealDayContext } from './mealPlanning.js'
import type { TripData, TripDay } from './tripTypes.js'

export function isShowActivityAvailable(
  data: TripData,
  day: TripDay,
): boolean {
  const context = onboardMealDayContext(data, day)
  return context === 'PORT' || context === 'SEA'
}
