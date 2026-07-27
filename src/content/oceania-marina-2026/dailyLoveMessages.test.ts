import { describe, expect, it } from 'vitest'

import { selectDailyLoveMessage } from '../../domain/content/dailyLoveMessage'
import { oceaniaMarina2026DailyLoveMessages } from './dailyLoveMessages'

describe('Oceania Marina 2026 daily love messages', () => {
  it('contains one unique message for every date from 27 July through 4 September', () => {
    const { messages } = oceaniaMarina2026DailyLoveMessages
    const expectedDates = Array.from({ length: 40 }, (_, offset) => {
      const date = new Date(Date.UTC(2026, 6, 27 + offset))
      return date.toISOString().slice(0, 10)
    })

    expect(messages).toHaveLength(40)
    expect(messages.map(({ localDate }) => localDate)).toEqual(expectedDates)
    expect(new Set(messages.map(({ localDate }) => localDate)).size).toBe(40)
    expect(new Set(messages.map(({ body }) => body)).size).toBe(40)
  })

  it('selects the deterministic message for a calendar date', () => {
    expect(
      selectDailyLoveMessage(
        oceaniaMarina2026DailyLoveMessages,
        '2026-08-22',
      ),
    ).toEqual({
      opening: 'Mon amour pour toujours,',
      body: 'Today our journey begins. Let us take in every moment, care for each other, and enjoy the wonderful days ahead.',
      closing: 'With all my love,',
      signature: 'Yoav ❤️',
    })
  })

  it('uses the fixed post-trip message after the final date', () => {
    expect(
      selectDailyLoveMessage(
        oceaniaMarina2026DailyLoveMessages,
        '2026-09-05',
      )?.body,
    ).toBe(
      'The journey may be behind us, but the memories we created together will stay with me. Thank you for sharing every beautiful moment with me.',
    )
  })

  it('omits the panel before the dated schedule begins', () => {
    expect(
      selectDailyLoveMessage(
        oceaniaMarina2026DailyLoveMessages,
        '2026-07-26',
      ),
    ).toBeNull()
  })
})
