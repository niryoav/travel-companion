import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../../test/fixtures/tripFixture'
import { selectHomeViewModel } from './selectHomeViewModel'

describe('selectHomeViewModel', () => {
  it.each([
    ['2030-05-01T12:00:00Z', 'PRE_TRIP', 'Our journey begins soon'],
    ['2030-05-10T12:00:00Z', 'DEPARTURE_DAY', 'Travel to Harbor City'],
    ['2030-05-11T12:00:00Z', 'CRUISE', 'Harbor City'],
    ['2030-05-12T12:00:00Z', 'CRUISE', 'At sea'],
    ['2030-05-14T12:00:00Z', 'FINAL_TRAVEL_DAY', 'Harbor City → Home'],
    ['2030-05-15T12:00:00Z', 'COMPLETED', 'Northern Coast Journey'],
  ] as const)(
    'adapts %s to %s Home content',
    (instant, phase, title) => {
      const viewModel = selectHomeViewModel(
        tripFixture,
        new Date(instant),
      )

      expect(viewModel.phase).toBe(phase)
      expect(viewModel.context.title).toBe(title)
      expect(viewModel.weather).toBeUndefined()
      expect(viewModel.checklist).toBeUndefined()
      expect(viewModel.alert).toBeUndefined()
    },
  )

  it('uses a port departure when no later event exists that day', () => {
    const viewModel = selectHomeViewModel(
      tripFixture,
      new Date('2030-05-11T12:00:00Z'),
    )

    expect(viewModel.milestone).toMatchObject({
      title: 'Depart Harbor Terminal',
      time: '18:00',
      allAboardTime: '17:30',
    })
  })

  it('changes the countdown at midnight in the trip home time zone', () => {
    const beforeBrusselsMidnight = selectHomeViewModel(
      tripFixture,
      new Date('2030-05-08T21:30:00Z'),
    )
    const afterBrusselsMidnight = selectHomeViewModel(
      tripFixture,
      new Date('2030-05-08T22:30:00Z'),
    )

    expect(beforeBrusselsMidnight.context.countdown).toBe(
      '2 days to departure',
    )
    expect(afterBrusselsMidnight.context.countdown).toBe(
      '1 day to departure',
    )
  })
})
