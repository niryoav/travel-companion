import { describe, expect, it } from 'vitest'

import { oceaniaMarina2026TripData } from '../../../trips/oceania-marina-2026/tripData'
import { selectDailyTestReminder } from './selectDailyTestReminder'

describe('selectDailyTestReminder', () => {
  it('generates a 10:00 local reminder for today, before the cruise window starts', () => {
    const reminder = selectDailyTestReminder(
      oceaniaMarina2026TripData,
      new Date('2026-08-15T09:00:00Z'),
    )
    expect(reminder).toMatchObject({
      id: 'trip-oceania-marina-2026:daily-test:2026-08-15',
      kind: 'daily-test',
      sourceEntityId: '2026-08-15',
      title: 'Travel Companion test',
      body: 'Dit is de dagelijkse testmelding. Reismeldingen werken op dit toestel.',
      // Marked so StartupRouteGate preserves /more on a cold launch instead
      // of redirecting to whatever selectStartupPath would otherwise pick.
      targetPath: '/more?source=notification',
      status: 'confirmed',
    })
    // 10:00 Europe/Brussels (CEST, UTC+2) on 2026-08-15.
    expect(reminder?.triggerAt).toBe('2026-08-15T08:00:00.000Z')
  })

  it('produces a stable id for the same local date regardless of the exact time of day', () => {
    const morning = selectDailyTestReminder(
      oceaniaMarina2026TripData,
      new Date('2026-08-15T05:00:00Z'),
    )
    const evening = selectDailyTestReminder(
      oceaniaMarina2026TripData,
      new Date('2026-08-15T20:00:00Z'),
    )
    expect(morning?.id).toBe(evening?.id)
  })

  it("still generates the morning-of test for the notification window's own start date, since 10:00 local is before that day's 17:45 window opening", () => {
    const reminder = selectDailyTestReminder(
      oceaniaMarina2026TripData,
      new Date('2026-08-21T09:00:00Z'), // 11:00 Europe/Brussels; triggerAt is fixed at 10:00 local regardless
    )
    expect(reminder).toMatchObject({
      id: 'trip-oceania-marina-2026:daily-test:2026-08-21',
      triggerAt: '2026-08-21T08:00:00.000Z',
    })
  })

  it('never fires once the real cruise window has started', () => {
    expect(
      selectDailyTestReminder(
        oceaniaMarina2026TripData,
        new Date('2026-08-22T07:00:00Z'),
      ),
    ).toBeNull()
  })

  it('never fires during or after the cruise', () => {
    expect(
      selectDailyTestReminder(
        oceaniaMarina2026TripData,
        new Date('2026-08-28T09:00:00Z'),
      ),
    ).toBeNull()
    expect(
      selectDailyTestReminder(
        oceaniaMarina2026TripData,
        new Date('2026-09-10T09:00:00Z'),
      ),
    ).toBeNull()
  })
})
