import { describe, expect, it } from 'vitest'

import { greetingFor } from './greeting'

describe('greetingFor', () => {
  it.each([
    [new Date(2030, 4, 10, 11, 59), 'Good morning, Alex'],
    [new Date(2030, 4, 10, 12, 0), 'Good afternoon, Alex'],
    [new Date(2030, 4, 10, 17, 59), 'Good afternoon, Alex'],
    [new Date(2030, 4, 10, 18, 0), 'Good evening, Alex'],
  ])('uses the local hour boundary at %s', (date, expected) => {
    expect(greetingFor('Alex', date)).toBe(expected)
  })

  it('includes the selected traveler', () => {
    expect(greetingFor('Sam', new Date(2030, 4, 10, 9))).toBe(
      'Good morning, Sam',
    )
  })
})
