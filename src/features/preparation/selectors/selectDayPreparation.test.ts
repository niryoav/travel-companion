import { describe, expect, it } from 'vitest'

import { oceaniaMarina2026TripData } from '../../../trips/oceania-marina-2026/tripData'
import { selectDayPreparation } from './selectDayPreparation'

function dayById(id: string) {
  const day = oceaniaMarina2026TripData.days.find((candidate) => candidate.id === id)
  if (!day) {
    throw new Error(`Missing day fixture: ${id}`)
  }
  return day
}

describe('selectDayPreparation', () => {
  it('represents the Reykjavík check-in window as separate from embarkation', () => {
    const preparation = selectDayPreparation(
      oceaniaMarina2026TripData,
      dayById('day-2026-08-23'),
    )

    const checkIn = preparation.timeline.find(
      (item) => item.id === 'event-reykjavik-terminal-checkin',
    )
    const embarkation = preparation.timeline.find(
      (item) => item.id === 'event-embarkation',
    )

    expect(checkIn).toMatchObject({
      title: 'Check-in at cruise terminal',
      timeLabel: '12:00',
    })
    expect(embarkation).toMatchObject({
      title: 'Embark Oceania Marina',
      timeLabel: '13:00',
    })
    expect(checkIn?.id).not.toBe(embarkation?.id)

    const documentTitles = preparation.documents.map(({ title }) => title)
    expect(documentTitles).toContain('Boarding pass')
  })

  it('shows the full Reykjavík sequence without any overlap between the transfer and check-in', () => {
    const preparation = selectDayPreparation(
      oceaniaMarina2026TripData,
      dayById('day-2026-08-23'),
    )

    const transfer = preparation.timeline.find(
      (item) => item.id === 'event-hotel-ship-transfer',
    )
    const checkIn = preparation.timeline.find(
      (item) => item.id === 'event-reykjavik-terminal-checkin',
    )
    const embarkation = preparation.timeline.find(
      (item) => item.id === 'event-embarkation',
    )

    expect(transfer).toMatchObject({
      title: 'Hotel Viking to Oceania Marina',
      timeLabel: '11:30',
    })
    expect(checkIn).toMatchObject({
      title: 'Check-in at cruise terminal',
      timeLabel: '12:00',
    })
    expect(embarkation).toMatchObject({
      title: 'Embark Oceania Marina',
      timeLabel: '13:00',
    })

    // The transfer's own event window (11:30–12:00) must end at or before
    // the check-in window starts (12:00) — no overlap.
    const transferEvent = oceaniaMarina2026TripData.events.find(
      ({ id }) => id === 'event-hotel-ship-transfer',
    )
    const checkInEvent = oceaniaMarina2026TripData.events.find(
      ({ id }) => id === 'event-reykjavik-terminal-checkin',
    )
    expect(Date.parse(transferEvent!.endsAt!)).toBeLessThanOrEqual(
      Date.parse(checkInEvent!.startsAt!),
    )
  })

  it('does not invent an All Aboard time when none is confirmed', () => {
    const preparation = selectDayPreparation(
      oceaniaMarina2026TripData,
      dayById('day-2026-08-24'),
    )

    expect(preparation.allAboard).toBeUndefined()
  })

  it('includes a motion-sickness reminder on a tender day', () => {
    const preparation = selectDayPreparation(
      oceaniaMarina2026TripData,
      dayById('day-2026-08-24'),
    )

    expect(preparation.port?.accessStatus).toBe('TENDER_REQUIRED')
    expect(preparation.motionSicknessReminder).toMatch(/motion-sickness/i)
  })

  it('includes a motion-sickness reminder for a docked-port boat excursion (Vestmanna sea cliffs)', () => {
    const preparation = selectDayPreparation(
      oceaniaMarina2026TripData,
      dayById('day-2026-08-27'),
    )

    expect(preparation.port?.accessStatus).toBe('DOCKED')
    expect(preparation.motionSicknessReminder).toMatch(/motion-sickness/i)
  })

  it('shows no motion-sickness reminder on an ordinary docked, non-boat excursion day', () => {
    const holyhead = selectDayPreparation(
      oceaniaMarina2026TripData,
      dayById('day-2026-09-01'),
    )
    const cork = selectDayPreparation(
      oceaniaMarina2026TripData,
      dayById('day-2026-09-02'),
    )
    const glasgow = selectDayPreparation(
      oceaniaMarina2026TripData,
      dayById('day-2026-08-30'),
    )

    expect(holyhead.motionSicknessReminder).toBeUndefined()
    expect(cork.motionSicknessReminder).toBeUndefined()
    expect(glasgow.motionSicknessReminder).toBeUndefined()
  })

  it('shows the restaurant reservation on the correct day', () => {
    const husavik = selectDayPreparation(
      oceaniaMarina2026TripData,
      dayById('day-2026-08-25'),
    )

    expect(husavik.restaurantReservation).toMatchObject({
      restaurant: 'Toscana',
      time: '20:00',
    })
  })

  it('labels official-guide checklist items and preserves external-excursion timing unchanged', () => {
    const isafjordur = selectDayPreparation(
      oceaniaMarina2026TripData,
      dayById('day-2026-08-24'),
    )
    const footwear = isafjordur.checklist
      .find((group) => group.category === 'FOOTWEAR')
      ?.items.find((item) => item.id === 'isafjordur-whale-footwear')
    expect(footwear?.level).toBe('RECOMMENDED')
    expect(footwear?.levelLabel).toBe('Recommended')

    const husavikSafari = oceaniaMarina2026TripData.events.find(
      ({ id }) => id === 'event-husavik-big-whale-safari',
    )
    expect(husavikSafari?.startsAt).toBe('2026-08-25T09:30:00Z')
    expect(husavikSafari?.organizer).toBe('Gentle Giants')
    expect(husavikSafari?.bookingType).toBe('INDEPENDENT')
  })

  it('marks required documents/timing items distinctly from recommended clothing guidance', () => {
    const husavik = selectDayPreparation(
      oceaniaMarina2026TripData,
      dayById('day-2026-08-25'),
    )
    const timing = husavik.checklist.find((group) => group.category === 'TIMING')
    const bring = husavik.checklist.find(
      (group) => group.category === 'WHAT_TO_BRING',
    )

    expect(timing?.items.every((item) => item.level === 'REQUIRED')).toBe(true)
    expect(
      bring?.items.some(
        (item) => item.id === 'husavik-geosea-bring' && item.level === 'REQUIRED',
      ),
    ).toBe(true)
  })

  it('is empty (with an emptyMessage) on a sea day with no bookings', () => {
    const seaDay = selectDayPreparation(
      oceaniaMarina2026TripData,
      dayById('day-2026-08-28'),
    )

    // 28 Aug has a Red Ginger dinner reservation, so it should NOT be empty.
    expect(seaDay.isEmpty).toBe(false)
    expect(seaDay.restaurantReservation?.restaurant).toBe('Red Ginger')
  })

  it('reports no preparation content for the final day (no tomorrow)', () => {
    const finalDay = selectDayPreparation(
      oceaniaMarina2026TripData,
      dayById('day-2026-09-04'),
    )

    expect(finalDay.excursions).toEqual([])
    expect(finalDay.restaurantReservation).toBeUndefined()
  })
})
