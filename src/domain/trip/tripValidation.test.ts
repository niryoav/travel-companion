import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../test/fixtures/tripFixture'
import { createDocumentFixture } from '../../test/fixtures/documentFixture'
import { validateTripData } from './tripValidation'

describe('validateTripData', () => {
  it('accepts valid contiguous trip-day windows', () => {
    expect(validateTripData(tripFixture)).toEqual([])
  })

  it('reports broken entity references', () => {
    const invalid = {
      ...tripFixture,
      trip: {
        ...tripFixture.trip,
        travelerIds: ['traveler-missing'],
      },
    }

    expect(validateTripData(invalid)).toContain(
      'Unknown trip traveler: traveler-missing',
    )
  })

  it('rejects unknown event traveler relationships', () => {
    const invalid = {
      ...tripFixture,
      events: tripFixture.events.map((event, index) =>
        index === 0
          ? { ...event, travelerIds: ['traveler-missing'] }
          : event,
      ),
    }

    expect(validateTripData(invalid)).toContain(
      `Unknown traveler traveler-missing on event ${tripFixture.events[0].id}`,
    )
  })

  it('rejects unknown transport location relationships', () => {
    const invalid = {
      ...tripFixture,
      transports: tripFixture.transports.map((transport, index) =>
        index === 0
          ? { ...transport, toLocationId: 'location-missing' }
          : transport,
      ),
    }

    expect(validateTripData(invalid)).toContain(
      `Unknown destination location-missing on transport ${tripFixture.transports[0].id}`,
    )
  })

  it('rejects a gap between consecutive trip-day windows', () => {
    const invalid = {
      ...tripFixture,
      days: tripFixture.days.map((day, index) =>
        index === 1
          ? { ...day, startsAt: '2030-05-10T23:00:00Z' }
          : day,
      ),
    }

    expect(validateTripData(invalid)).toContain(
      'Gap between trip-day windows: day-2030-05-10 -> day-2030-05-11',
    )
  })

  it('rejects overlapping consecutive trip-day windows', () => {
    const invalid = {
      ...tripFixture,
      days: tripFixture.days.map((day, index) =>
        index === 1
          ? { ...day, startsAt: '2030-05-10T21:00:00Z' }
          : day,
      ),
    }

    expect(validateTripData(invalid)).toContain(
      'Overlapping trip-day windows: day-2030-05-10 -> day-2030-05-11',
    )
  })

  it('rejects out-of-order trip-day windows', () => {
    const invalid = {
      ...tripFixture,
      days: [
        tripFixture.days[1],
        tripFixture.days[0],
        ...tripFixture.days.slice(2),
      ],
    }

    expect(validateTripData(invalid)).toContain(
      'Unsorted trip-day window: day-2030-05-10',
    )
  })

  it('rejects timing on an event whose schedule is pending', () => {
    const invalid = {
      ...tripFixture,
      events: tripFixture.events.map((event, index) =>
        index === 0
          ? {
              ...event,
              scheduleStatus: 'TO_BE_CONFIRMED' as const,
            }
          : event,
      ),
    }

    expect(validateTripData(invalid)).toContain(
      `Pending event schedule contains timing: ${tripFixture.events[0].id}`,
    )
  })

  it('rejects invalid or remote document metadata', () => {
    const invalid = {
      ...tripFixture,
      documentReferences: [
        createDocumentFixture({
          assetPath: 'https://example.com/private-ticket.pdf',
        }),
      ],
    }

    expect(validateTripData(invalid)).toContain(
      'Invalid document metadata: document-example',
    )
  })

  it('rejects invalid operational timing inputs', () => {
    const invalid = {
      ...tripFixture,
      events: tripFixture.events.map((event, index) =>
        index === 0
          ? {
              ...event,
              meetingAt: 'not-an-instant',
              travelDurationMinutes: -1,
              travelDurationVerification: 'ESTIMATED' as const,
              preparationNotes: [''],
            }
          : event,
      ),
    }

    expect(validateTripData(invalid)).toEqual(
      expect.arrayContaining([
        'Invalid event meeting time: event-flight-outbound',
        'Invalid event operational content: event-flight-outbound',
        'Invalid event operational timing: event-flight-outbound',
      ]),
    )
  })

  it('rejects invalid estimated timing ranges and anchors', () => {
    const invalid = {
      ...tripFixture,
      events: tripFixture.events.map((event, index) =>
        index === 0
          ? {
              ...event,
              travelDurationRangeMinutes: {
                minimum: 45,
                maximum: 40,
              },
              travelDurationVerification: 'ESTIMATED' as const,
              estimatedSchedule: {
                anchorEventId: 'event-missing',
                startOffsetMinutes: {
                  minimum: 40,
                  maximum: 35,
                },
              },
            }
          : event,
      ),
    }

    expect(validateTripData(invalid)).toContain(
      'Invalid event operational timing: event-flight-outbound',
    )
  })

  it('rejects unknown event-to-document relationships', () => {
    const invalid = {
      ...tripFixture,
      events: tripFixture.events.map((event, index) =>
        index === 0
          ? { ...event, documentReferenceIds: ['document-missing'] }
          : event,
      ),
    }

    expect(validateTripData(invalid)).toContain(
      `Unknown document document-missing on event ${tripFixture.events[0].id}`,
    )
  })
})
