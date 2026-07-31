import type {
  MealDayType,
  MealRestaurant,
  MealRestaurantId,
  MealServiceWindow,
  MealType,
  TripData,
  TripDay,
} from './tripTypes.js'

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
export type OnboardMealDayContext =
  | MealDayType
  | 'DISEMBARKATION'

export function onboardMealDayContext(
  data: TripData,
  day: TripDay,
): OnboardMealDayContext | null {
  const cruise = data.cruises.find(
    ({ id }) => id === data.trip.cruiseId,
  )
  if (
    cruise &&
    (
      day.localDate < cruise.embarkationDate ||
      day.localDate > cruise.disembarkationDate
    )
  ) {
    return null
  }
  if (cruise && day.localDate === cruise.disembarkationDate) {
    return 'DISEMBARKATION'
  }
  if (day.kind === 'PORT_DAY') {
    return 'PORT'
  }
  if (day.kind === 'SEA_DAY') {
    return 'SEA'
  }
  return null
}

export function serviceWindowsForMeal(
  data: TripData,
  restaurant: MealRestaurant,
  mealType: MealType,
  day: TripDay,
): MealServiceWindow[] {
  const dayContext = onboardMealDayContext(data, day)
  if (!dayContext) {
    return []
  }
  if (dayContext === 'DISEMBARKATION') {
    return mealType === 'BREAKFAST'
      ? (restaurant.services.BREAKFAST ?? []).filter(
          ({ dayType }) => dayType === undefined,
        )
      : []
  }
  return (restaurant.services[mealType] ?? []).filter(
    (window) => !window.dayType || window.dayType === dayContext,
  )
}

export function availableMealRestaurants(
  data: TripData,
  mealType: MealType,
  day: TripDay,
): MealRestaurant[] {
  return (data.mealRestaurants ?? []).filter(
    (restaurant) =>
      serviceWindowsForMeal(data, restaurant, mealType, day).length > 0,
  )
}

export function availableOnboardMomentTypes(
  data: TripData,
  day: TripDay,
): { mealTypes: MealType[]; highTea: boolean } {
  const context = onboardMealDayContext(data, day)
  if (!context) {
    return { mealTypes: [], highTea: false }
  }
  if (context === 'DISEMBARKATION') {
    return {
      mealTypes:
        availableMealRestaurants(data, 'BREAKFAST', day).length > 0
          ? ['BREAKFAST']
          : [],
      highTea: false,
    }
  }
  return {
    mealTypes: ['BREAKFAST', 'LUNCH', 'DINNER'],
    highTea: true,
  }
}

function timeToMinutes(value: string): number | null {
  const match = TIME_PATTERN.exec(value)
  if (!match) {
    return null
  }
  return Number(match[1]) * 60 + Number(match[2])
}

function minutesToTime(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(
    value % 60,
  ).padStart(2, '0')}`
}

export function generateServiceTimes(
  windows: readonly MealServiceWindow[],
): string[] {
  const values = new Set<string>()
  for (const window of windows) {
    const opensAt = timeToMinutes(window.opensAt)
    const closesAt = timeToMinutes(window.closesAt)
    if (
      opensAt === null ||
      closesAt === null ||
      opensAt > closesAt
    ) {
      continue
    }
    for (let minute = opensAt; minute <= closesAt; minute += 15) {
      values.add(minutesToTime(minute))
    }
  }
  return [...values].sort()
}

export function validMealTimes(
  data: TripData,
  restaurant: MealRestaurant,
  mealType: MealType,
  day: TripDay,
): string[] {
  return generateServiceTimes(
    serviceWindowsForMeal(data, restaurant, mealType, day),
  )
}

export function isValidMealSelection(
  data: TripData,
  day: TripDay,
  mealType: MealType,
  restaurantId: MealRestaurantId,
  localTime: string,
): boolean {
  const restaurant = data.mealRestaurants?.find(
    ({ id }) => id === restaurantId,
  )
  return Boolean(
    restaurant &&
      validMealTimes(data, restaurant, mealType, day).includes(localTime),
  )
}

export function formatServiceWindows(
  windows: readonly MealServiceWindow[],
): string {
  return windows
    .map(({ opensAt, closesAt }) => `${opensAt}–${closesAt}`)
    .join(', ')
}
