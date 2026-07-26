import { describe, expect, it } from 'vitest'

import { greetingFor } from './greeting'

describe('greetingFor', () => {
  it.each([
    [new Date(2026, 7, 22, 11, 59), 'Good morning, Yoav'],
    [new Date(2026, 7, 22, 12, 0), 'Good afternoon, Yoav'],
    [new Date(2026, 7, 22, 17, 59), 'Good afternoon, Yoav'],
    [new Date(2026, 7, 22, 18, 0), 'Good evening, Yoav'],
  ])('uses the local hour boundary at %s', (date, expected) => {
    expect(greetingFor('Yoav', date)).toBe(expected)
  })

  it('includes the selected traveler', () => {
    expect(greetingFor('Isabel', new Date(2026, 7, 22, 9))).toBe(
      'Good morning, Isabel',
    )
  })
})
