import type { TravelerProfile } from './homeTypes'

export function greetingFor(
  traveler: TravelerProfile,
  date = new Date(),
): string {
  const hour = date.getHours()

  if (hour < 12) {
    return `Good morning, ${traveler}`
  }

  if (hour < 18) {
    return `Good afternoon, ${traveler}`
  }

  return `Good evening, ${traveler}`
}
