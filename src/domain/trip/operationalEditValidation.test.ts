import { describe, expect, it } from 'vitest'

import type {
  OperationalEditValidationInput,
} from './operationalEditValidation'
import {
  MAX_EXCURSION_TRAVEL_MINUTES,
  MAX_TENDER_CROSSING_MINUTES,
  validateOperationalEditTiming,
} from './operationalEditValidation'

function tenderTime(time = '') {
  return {
    time,
    verification: time ? 'CONFIRMED' as const : 'TO_BE_CONFIRMED' as const,
  }
}

function baseInput(): OperationalEditValidationInput {
  return {
    allAboardTime: '15:30',
    allAboardVerification: 'ESTIMATED',
    arrivalTime: '09:00',
    departureTime: '16:00',
    excursions: [],
    firstTender: tenderTime(),
    lastTender: tenderTime(),
    localDate: '2026-08-24',
    tenderReport: tenderTime(),
    ourTenderAshore: tenderTime(),
    ourTenderBack: tenderTime(),
    portAccessStatus: 'TENDER_REQUIRED',
    tenderCrossingMinutes: '',
    timeZone: 'Atlantic/Reykjavik',
  }
}

function excursionInput() {
  return {
    bookingType: 'INDEPENDENT' as const,
    endTime: '14:00',
    id: 'event-coastal-tour',
    meetingTime: '09:15',
    safetyBufferMinutes: 15,
    startTime: '09:30',
    status: 'CONFIRMED' as const,
    timeZone: 'Atlantic/Reykjavik',
    travelDurationMinutes: '',
  }
}

function validate(
  mutate: (input: OperationalEditValidationInput) => void,
) {
  const input = baseInput()
  mutate(input)
  return validateOperationalEditTiming(input)
}

describe('operational edit timing validation', () => {
  it('blocks first tender before arrival and accepts equality', () => {
    const invalid = validate((input) => {
      input.firstTender = tenderTime('08:45')
    })
    const equal = validate((input) => {
      input.firstTender = tenderTime('09:00')
    })

    expect(invalid.errors).toContainEqual({
      field: 'firstTenderTime',
      message: 'First tender cannot be before ship arrival at 09:00.',
      severity: 'ERROR',
    })
    expect(equal.errors).toEqual([])
  })

  it('blocks first tender after departure and accepts equality', () => {
    const invalid = validate((input) => {
      input.firstTender = tenderTime('16:15')
    })
    const equal = validate((input) => {
      input.firstTender = tenderTime('16:00')
    })

    expect(invalid.errors).toContainEqual({
      field: 'firstTenderTime',
      message: 'First tender cannot be after ship departure at 16:00.',
      severity: 'ERROR',
    })
    expect(equal.errors).toEqual([])
  })

  it('blocks our tender before first tender and accepts equality', () => {
    const invalid = validate((input) => {
      input.firstTender = tenderTime('09:15')
      input.ourTenderAshore = tenderTime('09:00')
    })
    const equal = validate((input) => {
      input.firstTender = tenderTime('09:15')
      input.ourTenderAshore = tenderTime('09:15')
    })

    expect(invalid.errors).toContainEqual({
      field: 'ourTenderAshoreTime',
      message: 'Our tender ashore cannot be before the first tender at 09:15.',
      severity: 'ERROR',
    })
    expect(equal.errors).toEqual([])
  })

  it('blocks tender report after our tender ashore and accepts equality', () => {
    const invalid = validate((input) => {
      input.tenderReport = tenderTime('09:30')
      input.ourTenderAshore = tenderTime('09:15')
    })
    const equal = validate((input) => {
      input.tenderReport = tenderTime('09:15')
      input.ourTenderAshore = tenderTime('09:15')
    })

    expect(invalid.errors).toContainEqual({
      field: 'tenderReportTime',
      message:
        'Tender report cannot be after our tender ashore at 09:15.',
      severity: 'ERROR',
    })
    expect(equal.errors).toEqual([])
  })

  it('validates our tender back against arrival and the effective deadline', () => {
    const beforeArrival = validate((input) => {
      input.ourTenderBack = tenderTime('08:45')
    })
    const atArrival = validate((input) => {
      input.ourTenderBack = tenderTime('09:00')
    })
    const afterLastTender = validate((input) => {
      input.lastTender = tenderTime('15:15')
      input.ourTenderBack = tenderTime('15:20')
    })
    const afterEarlierAllAboard = validate((input) => {
      input.lastTender = tenderTime('15:45')
      input.ourTenderBack = tenderTime('15:40')
    })
    const atAllAboard = validate((input) => {
      input.lastTender = tenderTime('15:45')
      input.ourTenderBack = tenderTime('15:30')
    })

    expect(beforeArrival.errors.map(({ message }) => message)).toContain(
      'Our tender back cannot be before ship arrival at 09:00.',
    )
    expect(atArrival.errors).toEqual([])
    expect(afterLastTender.errors.map(({ message }) => message)).toContain(
      'Our tender back cannot be after the last tender at 15:15.',
    )
    expect(
      afterEarlierAllAboard.errors.map(({ message }) => message),
    ).toContain('Our tender back cannot be after All Aboard at 15:30.')
    expect(atAllAboard.errors).toEqual([])
  })

  it('warns for a tight personal return margin but not a safe one', () => {
    const tight = validate((input) => {
      input.lastTender = tenderTime('15:45')
      input.ourTenderBack = tenderTime('15:10')
    })
    const safe = validate((input) => {
      input.lastTender = tenderTime('15:45')
      input.ourTenderBack = tenderTime('14:30')
    })

    expect(tight.errors).toEqual([])
    expect(tight.warnings.map(({ message }) => message)).toContain(
      'Only 20 minutes remain before the tender return deadline.',
    )
    expect(safe.issues).toEqual([])
  })

  it('blocks last tender after departure and accepts equality', () => {
    const invalid = validate((input) => {
      input.lastTender = tenderTime('16:15')
    })
    const equal = validate((input) => {
      input.lastTender = tenderTime('16:00')
    })

    expect(invalid.errors).toContainEqual({
      field: 'lastTenderTime',
      message: 'Last tender cannot be after ship departure at 16:00.',
      severity: 'ERROR',
    })
    expect(equal.errors).toEqual([])
  })

  it('blocks last tender before arrival and accepts equality', () => {
    const invalid = validate((input) => {
      input.lastTender = tenderTime('08:45')
    })
    const equal = validate((input) => {
      input.lastTender = tenderTime('09:00')
    })

    expect(invalid.errors).toContainEqual({
      field: 'lastTenderTime',
      message: 'Last tender cannot be before ship arrival at 09:00.',
      severity: 'ERROR',
    })
    expect(equal.errors).toEqual([])
  })

  it('blocks All Aboard after departure', () => {
    const result = validate((input) => {
      input.allAboardTime = '16:15'
    })

    expect(result.errors).toContainEqual({
      field: 'allAboardTime',
      message: 'All Aboard cannot be after ship departure at 16:00.',
      severity: 'ERROR',
    })
  })

  it('blocks first or personal tender after the last tender', () => {
    const firstTender = validate((input) => {
      input.firstTender = tenderTime('15:45')
      input.lastTender = tenderTime('15:30')
    })
    const ourTenderAshore = validate((input) => {
      input.ourTenderAshore = tenderTime('15:45')
      input.lastTender = tenderTime('15:30')
    })

    expect(firstTender.errors.map(({ message }) => message)).toContain(
      'First tender cannot be after the last tender.',
    )
    expect(ourTenderAshore.errors.map(({ message }) => message)).toContain(
      'Our tender ashore cannot be after the last tender at 15:30.',
    )
  })

  it.each(['0', '-1', `${MAX_TENDER_CROSSING_MINUTES + 1}`])(
    'blocks invalid tender crossing duration %s',
    (value) => {
      const result = validate((input) => {
        input.tenderCrossingMinutes = value
      })

      expect(result.errors).toContainEqual({
        field: 'tenderCrossingMinutes',
        message:
          `Tender crossing duration must be a whole number between 1 and ${MAX_TENDER_CROSSING_MINUTES}.`,
        severity: 'ERROR',
      })
    },
  )

  it('keeps missing and TBC tender values neutral', () => {
    const result = validate((input) => {
      input.allAboardTime = ''
      input.allAboardVerification = 'TO_BE_CONFIRMED'
    })

    expect(result.issues).toEqual([])
  })

  it('blocks excursion start before meeting and accepts equality', () => {
    const invalid = validate((input) => {
      input.excursions = [
        { ...excursionInput(), startTime: '09:00' },
      ]
    })
    const equal = validate((input) => {
      input.excursions = [
        { ...excursionInput(), startTime: '09:15' },
      ]
    })

    expect(invalid.errors).toContainEqual({
      field: 'excursion:event-coastal-tour:startTime',
      message: 'Excursion start cannot be before the meeting time at 09:15.',
      severity: 'ERROR',
    })
    expect(equal.errors).toEqual([])
  })

  it('blocks excursion return before or equal to its start', () => {
    for (const endTime of ['09:15', '09:30']) {
      const result = validate((input) => {
        input.excursions = [
          { ...excursionInput(), endTime },
        ]
      })

      expect(result.errors.map(({ message }) => message)).toContain(
        'Excursion return cannot be before the excursion start.',
      )
    }
  })

  it('blocks excursion return after departure, All Aboard, or last tender', () => {
    const afterDeparture = validate((input) => {
      input.allAboardTime = ''
      input.excursions = [
        { ...excursionInput(), endTime: '16:15' },
      ]
    })
    const afterAllAboard = validate((input) => {
      input.excursions = [
        { ...excursionInput(), endTime: '15:45' },
      ]
    })
    const afterLastTender = validate((input) => {
      input.allAboardTime = ''
      input.lastTender = tenderTime('15:30')
      input.excursions = [
        { ...excursionInput(), endTime: '15:45' },
      ]
    })

    expect(afterDeparture.errors.map(({ message }) => message)).toContain(
      'Excursion return cannot be after ship departure at 16:00.',
    )
    expect(afterAllAboard.errors.map(({ message }) => message)).toContain(
      'Excursion return cannot be after All Aboard at 15:30.',
    )
    expect(afterLastTender.errors.map(({ message }) => message)).toContain(
      'Excursion return cannot be after the last tender at 15:30.',
    )
  })

  it('does not require timing for a cancelled excursion', () => {
    const result = validate((input) => {
      input.excursions = [{
        ...excursionInput(),
        endTime: '08:00',
        meetingTime: '',
        startTime: '',
        status: 'CANCELLED',
        travelDurationMinutes: '0',
      }]
    })

    expect(result.issues).toEqual([])
  })

  it.each(['0', '-1', `${MAX_EXCURSION_TRAVEL_MINUTES + 1}`])(
    'blocks invalid independent travel duration %s',
    (value) => {
      const result = validate((input) => {
        input.excursions = [{
          ...excursionInput(),
          travelDurationMinutes: value,
        }]
      })

      expect(result.errors).toContainEqual({
        field:
          'excursion:event-coastal-tour:travelDurationMinutes',
        message:
          `Estimated travel duration must be a whole number between 1 and ${MAX_EXCURSION_TRAVEL_MINUTES}.`,
        severity: 'ERROR',
      })
    },
  )

  it('warns when last tender is earlier than All Aboard without blocking', () => {
    const result = validate((input) => {
      input.lastTender = tenderTime('15:15')
    })

    expect(result.errors).toEqual([])
    expect(result.warnings).toContainEqual({
      field: 'lastTenderTime',
      message:
        'Last tender is earlier than All Aboard. Plan to use the last tender time.',
      severity: 'WARNING',
    })
  })

  it('warns for a tight independent tender connection', () => {
    const result = validate((input) => {
      input.tenderReport = tenderTime('08:50')
      input.ourTenderAshore = tenderTime('09:00')
      input.tenderCrossingMinutes = '10'
      input.excursions = [{
        ...excursionInput(),
        meetingTime: '09:20',
        travelDurationMinutes: '5',
      }]
    })

    expect(result.errors).toEqual([])
    expect(result.warnings).toContainEqual({
      field: 'excursion:event-coastal-tour:meetingTime',
      message:
        'Only 5 minutes remain between tender arrival and the excursion meeting time.',
      severity: 'WARNING',
    })
  })

  it('blocks an impossible independent tender connection', () => {
    const result = validate((input) => {
      input.tenderReport = tenderTime('08:50')
      input.ourTenderAshore = tenderTime('09:00')
      input.tenderCrossingMinutes = '20'
      input.excursions = [{
        ...excursionInput(),
        meetingTime: '09:15',
      }]
    })

    expect(result.errors).toContainEqual({
      field: 'excursion:event-coastal-tour:meetingTime',
      message: 'Tender arrival would be after the excursion meeting time.',
      severity: 'ERROR',
    })
  })

  it('uses the centralized return-buffer threshold for warnings', () => {
    const result = validate((input) => {
      input.excursions = [{
        ...excursionInput(),
        endTime: '15:00',
      }]
    })

    expect(result.errors).toEqual([])
    expect(result.warnings).toContainEqual({
      field: 'excursion:event-coastal-tour:endTime',
      message: 'Only 30 minutes remain before All Aboard.',
      severity: 'WARNING',
    })
  })
})
