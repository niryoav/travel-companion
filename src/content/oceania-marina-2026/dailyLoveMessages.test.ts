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

  it.each([
    ['2026-07-27', 'Every day brings us a little closer'],
    ['2026-08-21', 'Tomorrow we begin the journey'],
    ['2026-08-22', 'Today our journey begins'],
    ['2026-08-23', 'Today we step aboard'],
    ['2026-08-28', 'A day at sea gives us time'],
    ['2026-09-04', 'As we travel home'],
  ])('selects the approved phase message for %s', (localDate, text) => {
    expect(
      selectDailyLoveMessage(
        oceaniaMarina2026DailyLoveMessages,
        localDate,
      )?.body,
    ).toContain(text)
  })

  it('applies the exact opening and signature to every dated message', () => {
    for (const { localDate } of oceaniaMarina2026DailyLoveMessages.messages) {
      const message = selectDailyLoveMessage(
        oceaniaMarina2026DailyLoveMessages,
        localDate,
      )

      expect(message?.opening).toBe('Mon amour pour toujours,')
      expect(message?.closing).toBe('With all my love,')
      expect(message?.signature).toBe('Yoav ❤️')
    }
  })

  it('is stable for repeated selection and changes on the next date', () => {
    const firstSelection = selectDailyLoveMessage(
      oceaniaMarina2026DailyLoveMessages,
      '2026-08-21',
    )
    const repeatedSelection = selectDailyLoveMessage(
      oceaniaMarina2026DailyLoveMessages,
      '2026-08-21',
    )
    const nextSelection = selectDailyLoveMessage(
      oceaniaMarina2026DailyLoveMessages,
      '2026-08-22',
    )

    expect(repeatedSelection).toEqual(firstSelection)
    expect(nextSelection?.body).not.toBe(firstSelection?.body)
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
