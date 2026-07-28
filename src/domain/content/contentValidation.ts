import type { TripData } from '../trip/tripTypes'
import type {
  DestinationGuide,
  DestinationImage,
  ExcursionGuide,
  SourceReference,
  TripContentBundle,
} from './contentTypes'

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
}

function isPublicUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function duplicateIds(values: { id: string }[]): string[] {
  const seen = new Set<string>()
  return values
    .map(({ id }) => id)
    .filter((id) => {
      if (seen.has(id)) {
        return true
      }
      seen.add(id)
      return false
    })
}

function validateSources(
  ownerId: string,
  sources: SourceReference[],
): string[] {
  const errors: string[] = []

  if (sources.length === 0) {
    errors.push(`Missing content sources: ${ownerId}`)
  }
  for (const sourceId of duplicateIds(sources)) {
    errors.push(`Duplicate source ID ${sourceId} on content ${ownerId}`)
  }
  for (const source of sources) {
    if (!source.id.trim() || !source.name.trim()) {
      errors.push(`Invalid content source: ${ownerId}`)
    }
    if (!isCalendarDate(source.reviewedAt)) {
      errors.push(`Invalid source review date ${source.id}: ${ownerId}`)
    }
    if (source.url && !isPublicUrl(source.url)) {
      errors.push(`Invalid source URL ${source.id}: ${ownerId}`)
    }
  }

  return errors
}

function validateImage(
  guideId: string,
  image: DestinationImage,
): string[] {
  const errors: string[] = []

  if (!image.src.startsWith('/images/') || !image.src.endsWith('.webp')) {
    errors.push(`Invalid destination image path: ${guideId}`)
  }
  if (!image.alt.trim()) {
    errors.push(`Missing destination image alt text: ${guideId}`)
  }
  if (
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width <= 0 ||
    image.height <= 0
  ) {
    errors.push(`Invalid destination image dimensions: ${guideId}`)
  } else if (image.width * 9 !== image.height * 16) {
    errors.push(`Destination image must use 16:9: ${guideId}`)
  }
  for (const value of [image.sourceUrl, image.licenseUrl]) {
    if (value && !isPublicUrl(value)) {
      errors.push(`Invalid destination image URL: ${guideId}`)
    }
  }

  return errors
}

function validateDestinationGuide(
  guide: DestinationGuide,
  locationIds: Set<string>,
): string[] {
  const errors: string[] = []

  if (!locationIds.has(guide.locationId)) {
    errors.push(
      `Unknown destination location ${guide.locationId}: ${guide.id}`,
    )
  }
  if (!guide.id.trim() || !guide.introduction.trim()) {
    errors.push(`Missing destination content: ${guide.id}`)
  }
  if (
    guide.highlights.length < 3 ||
    guide.highlights.length > 5 ||
    guide.highlights.some((highlight) => !highlight.trim())
  ) {
    errors.push(`Destination highlights must contain 3–5 items: ${guide.id}`)
  }
  if (
    guide.practicalFacts.length < 2 ||
    guide.practicalFacts.length > 4 ||
    guide.practicalFacts.some(
      ({ label, value }) => !label.trim() || !value.trim(),
    )
  ) {
    errors.push(`Destination facts must contain 2–4 complete items: ${guide.id}`)
  }
  if (
    (guide.goodToKnow?.length ?? 0) > 3 ||
    guide.goodToKnow?.some((item) => !item.trim())
  ) {
    errors.push(`Destination good-to-know limit exceeded: ${guide.id}`)
  }
  if (!isCalendarDate(guide.reviewedAt)) {
    errors.push(`Invalid destination review date: ${guide.id}`)
  }

  errors.push(...validateSources(guide.id, guide.sourceReferences))
  if (guide.image) {
    errors.push(...validateImage(guide.id, guide.image))
  }
  return errors
}

function validateExcursionGuide(
  guide: ExcursionGuide,
  data: TripData,
): string[] {
  const errors: string[] = []
  const event = data.events.find(({ id }) => id === guide.eventId)

  if (!event) {
    errors.push(`Unknown excursion event ${guide.eventId}: ${guide.id}`)
  } else if (event.kind !== 'EXCURSION') {
    errors.push(`Content event is not an excursion ${guide.eventId}: ${guide.id}`)
  }
  if (!guide.id.trim() || !guide.summary.trim()) {
    errors.push(`Missing excursion content: ${guide.id}`)
  }
  if (
    guide.highlights &&
    (guide.highlights.length < 3 ||
      guide.highlights.length > 5 ||
      guide.highlights.some((highlight) => !highlight.trim()))
  ) {
    errors.push(`Excursion highlights must contain 3–5 items: ${guide.id}`)
  }
  for (const [label, items] of [
    ['look-out-for', guide.lookOutFor],
    ['fun-facts', guide.funFacts],
    ['preparation', guide.preparation],
  ] as const) {
    if (
      (items?.length ?? 0) > 5 ||
      items?.some((item) => !item.trim())
    ) {
      errors.push(`Invalid excursion ${label} items: ${guide.id}`)
    }
  }
  if (
    (guide.context !== undefined && !guide.context.trim()) ||
    (guide.seasonalNote !== undefined && !guide.seasonalNote.trim())
  ) {
    errors.push(`Invalid excursion supporting content: ${guide.id}`)
  }
  if (!isCalendarDate(guide.reviewedAt)) {
    errors.push(`Invalid excursion review date: ${guide.id}`)
  }

  errors.push(...validateSources(guide.id, guide.sourceReferences))
  return errors
}

export function validateTripContent(
  content: TripContentBundle,
  data: TripData,
): string[] {
  const errors: string[] = []

  if (content.tripId !== data.trip.id) {
    errors.push(`Content trip does not match trip data: ${content.tripId}`)
  }
  if (!content.contentVersion.trim()) {
    errors.push('Missing content version')
  }

  const allGuides = [
    ...content.destinationGuides,
    ...content.excursionGuides,
  ]
  for (const guideId of duplicateIds(allGuides)) {
    errors.push(`Duplicate content ID: ${guideId}`)
  }
  const destinationLocations = new Set<string>()
  for (const guide of content.destinationGuides) {
    if (destinationLocations.has(guide.locationId)) {
      errors.push(`Duplicate destination location: ${guide.locationId}`)
    }
    destinationLocations.add(guide.locationId)
  }
  const excursionEvents = new Set<string>()
  for (const guide of content.excursionGuides) {
    if (excursionEvents.has(guide.eventId)) {
      errors.push(`Duplicate excursion event: ${guide.eventId}`)
    }
    excursionEvents.add(guide.eventId)
  }

  const locationIds = new Set(data.locations.map(({ id }) => id))
  for (const guide of content.destinationGuides) {
    errors.push(...validateDestinationGuide(guide, locationIds))
  }
  for (const guide of content.excursionGuides) {
    errors.push(...validateExcursionGuide(guide, data))
  }

  return errors
}

export function assertValidTripContent(
  content: TripContentBundle,
  data: TripData,
): TripContentBundle {
  const errors = validateTripContent(content, data)
  if (errors.length > 0) {
    throw new Error(`Invalid trip content:\n${errors.join('\n')}`)
  }
  return content
}
