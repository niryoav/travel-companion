import { describe, expect, it } from 'vitest'

import { assertValidTripContent } from '../../domain/content/contentValidation'
import { assertValidTripData } from '../../domain/trip/tripValidation'
import { oceaniaInsignia2027TripContent } from '../../content/oceania-insignia-2027/tripContent'
import { oceaniaInsignia2027TripData } from './tripData'

describe('Oceania Insignia 2027 trip skeleton', () => {
  it('is valid canonical trip data', () => {
    expect(assertValidTripData(oceaniaInsignia2027TripData)).toBe(
      oceaniaInsignia2027TripData,
    )
    expect(
      assertValidTripContent(
        oceaniaInsignia2027TripContent,
        oceaniaInsignia2027TripData,
      ),
    ).toBe(oceaniaInsignia2027TripContent)
  })

  it('starts with the provisional Saturday flight before embarkation', () => {
    expect(oceaniaInsignia2027TripData.trip.startDate).toBe('2027-06-19')
    expect(oceaniaInsignia2027TripData.trip.cruiseId).toBe(
      'cruise-oceania-insignia-2027',
    )
    expect(oceaniaInsignia2027TripData.cruises[0]).toMatchObject({
      shipName: 'Oceania Insignia',
      embarkationDate: '2027-06-21',
      disembarkationDate: '2027-07-04',
    })
  })

  it('matches the published Oceania cruise route', () => {
    expect(
      oceaniaInsignia2027TripData.days.map(({ localDate, title }) => [
        localDate,
        title,
      ]),
    ).toEqual([
      ['2027-06-19', 'Belgium → Copenhagen'],
      ['2027-06-20', 'Copenhagen'],
      ['2027-06-21', 'Copenhagen'],
      ['2027-06-22', 'At sea'],
      ['2027-06-23', 'Måløy'],
      ['2027-06-24', 'Trondheim'],
      ['2027-06-25', 'Leknes (Lofoten Islands)'],
      ['2027-06-26', 'Harstad'],
      ['2027-06-27', 'Hammerfest'],
      ['2027-06-28', 'North Cape (Honningsvåg)'],
      ['2027-06-29', 'Alta'],
      ['2027-06-30', 'Tromsø'],
      ['2027-07-01', 'At sea'],
      ['2027-07-02', 'At sea'],
      ['2027-07-03', 'Ísafjörður'],
      ['2027-07-04', 'Reykjavík'],
    ])
  })

  it('does not invent All Aboard or tender times', () => {
    for (const portCall of oceaniaInsignia2027TripData.portCalls) {
      expect(portCall.allAboardAt).toBeUndefined()
      expect(portCall.portAccess).toBeUndefined()
    }
  })
})
