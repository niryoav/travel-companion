import { describe, expect, it } from 'vitest'

import { oceaniaMarina2026TripData } from '../../trips/oceania-marina-2026/tripData'
import { isShowActivityAvailable } from './showActivityPlanning'

function day(dayId: string) {
  return oceaniaMarina2026TripData.days.find(({ id }) => id === dayId)!
}

describe('Show / activity day availability', () => {
  it('uses the canonical cruise dates to exclude travel and disembarkation days', () => {
    expect(
      isShowActivityAvailable(
        oceaniaMarina2026TripData,
        day('day-2026-08-22'),
      ),
    ).toBe(false)
    expect(
      isShowActivityAvailable(
        oceaniaMarina2026TripData,
        day('day-2026-09-04'),
      ),
    ).toBe(false)
  })

  it('allows ordinary port and sea days', () => {
    expect(
      isShowActivityAvailable(
        oceaniaMarina2026TripData,
        day('day-2026-08-24'),
      ),
    ).toBe(true)
    expect(
      isShowActivityAvailable(
        oceaniaMarina2026TripData,
        day('day-2026-08-28'),
      ),
    ).toBe(true)
  })
})
