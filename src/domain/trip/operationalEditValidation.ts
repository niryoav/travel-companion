import { instantFromLocalTime } from './localTimeInput.js'
import {
  RETURN_BUFFER_THRESHOLDS,
  TIGHT_CONNECTION_WARNING_MINUTES,
} from './operationalTiming.js'
import type {
  ExcursionOperationalStatus,
  OperationalEntryStatus,
  PortAccessStatus,
  TripEvent,
} from './tripTypes.js'

export const MAX_TENDER_CROSSING_MINUTES = 240
export const MAX_EXCURSION_TRAVEL_MINUTES = 1_440

export type OperationalEditField =
  | 'arrivalTime'
  | 'departureTime'
  | 'allAboardTime'
  | 'firstTenderTime'
  | 'tenderReportTime'
  | 'ourTenderAshoreTime'
  | 'ourTenderBackTime'
  | 'tenderCrossingMinutes'
  | 'lastTenderTime'
  | `excursion:${string}:meetingTime`
  | `excursion:${string}:startTime`
  | `excursion:${string}:endTime`
  | `excursion:${string}:travelDurationMinutes`

export interface OperationalEditIssue {
  field: OperationalEditField
  message: string
  severity: 'ERROR' | 'WARNING'
}

export interface OperationalEditValidationResult {
  errors: OperationalEditIssue[]
  issues: OperationalEditIssue[]
  warnings: OperationalEditIssue[]
}

interface TenderTimeInput {
  time: string
  verification: OperationalEntryStatus
}

interface ExcursionTimingInput {
  bookingType?: TripEvent['bookingType']
  endTime: string
  id: string
  meetingTime: string
  safetyBufferMinutes?: number
  startTime: string
  status: ExcursionOperationalStatus
  timeZone: string
  travelDurationMinutes: string
}

export interface OperationalEditValidationInput {
  allAboardTime: string
  allAboardVerification: OperationalEntryStatus
  arrivalTime: string
  departureTime: string
  excursions: ExcursionTimingInput[]
  firstTender: TenderTimeInput
  lastTender: TenderTimeInput
  localDate: string
  tenderReport: TenderTimeInput
  ourTenderAshore: TenderTimeInput
  ourTenderBack: TenderTimeInput
  portAccessStatus: PortAccessStatus
  tenderCrossingMinutes: string
  timeZone: string
}

function excursionField(
  eventId: string,
  field:
    | 'meetingTime'
    | 'startTime'
    | 'endTime'
    | 'travelDurationMinutes',
): OperationalEditField {
  return `excursion:${eventId}:${field}`
}

function addIssue(
  issues: OperationalEditIssue[],
  severity: OperationalEditIssue['severity'],
  field: OperationalEditField,
  message: string,
) {
  issues.push({ field, message, severity })
}

function resolveTime(
  localDate: string,
  time: string,
  timeZone: string,
  field: OperationalEditField,
  label: string,
  issues: OperationalEditIssue[],
): number | undefined {
  if (!time) {
    return undefined
  }
  const instant = instantFromLocalTime(localDate, time, timeZone)
  if (!instant) {
    addIssue(
      issues,
      'ERROR',
      field,
      `${label} is not a valid local time.`,
    )
    return undefined
  }
  return Date.parse(instant)
}

function resolveTenderTime(
  input: TenderTimeInput,
  localDate: string,
  timeZone: string,
  field: OperationalEditField,
  label: string,
  issues: OperationalEditIssue[],
): number | undefined {
  if (!input.time && input.verification === 'TO_BE_CONFIRMED') {
    return undefined
  }
  if (!input.time) {
    addIssue(
      issues,
      'ERROR',
      field,
      `${label} needs a time or To be confirmed status.`,
    )
    return undefined
  }
  if (input.verification === 'TO_BE_CONFIRMED') {
    addIssue(
      issues,
      'ERROR',
      field,
      `${label} needs a confirmed or estimated status.`,
    )
    return undefined
  }
  return resolveTime(
    localDate,
    input.time,
    timeZone,
    field,
    label,
    issues,
  )
}

function positiveWholeMinutes(
  input: string,
  maximum: number,
  field: OperationalEditField,
  label: string,
  issues: OperationalEditIssue[],
): number | undefined {
  if (!input) {
    return undefined
  }
  const value = Number(input)
  if (!Number.isInteger(value) || value <= 0 || value > maximum) {
    addIssue(
      issues,
      'ERROR',
      field,
      `${label} must be a whole number between 1 and ${maximum}.`,
    )
    return undefined
  }
  return value
}

export function validateOperationalEditTiming(
  input: OperationalEditValidationInput,
): OperationalEditValidationResult {
  const issues: OperationalEditIssue[] = []
  const arrival = resolveTime(
    input.localDate,
    input.arrivalTime,
    input.timeZone,
    'arrivalTime',
    'Ship arrival',
    issues,
  )
  const departure = resolveTime(
    input.localDate,
    input.departureTime,
    input.timeZone,
    'departureTime',
    'Ship departure',
    issues,
  )
  const allAboard = resolveTenderTime(
    {
      time: input.allAboardTime,
      verification: input.allAboardVerification,
    },
    input.localDate,
    input.timeZone,
    'allAboardTime',
    'All Aboard',
    issues,
  )

  if (
    arrival !== undefined &&
    departure !== undefined &&
    arrival >= departure
  ) {
    addIssue(
      issues,
      'ERROR',
      'departureTime',
      'Ship departure must be after arrival.',
    )
  }
  if (
    allAboard !== undefined &&
    departure !== undefined &&
    allAboard > departure
  ) {
    addIssue(
      issues,
      'ERROR',
      'allAboardTime',
      `All Aboard cannot be after ship departure at ${input.departureTime}.`,
    )
  }

  let firstTender: number | undefined
  let tenderReport: number | undefined
  let ourTenderAshore: number | undefined
  let ourTenderBack: number | undefined
  let lastTender: number | undefined
  let crossingMinutes: number | undefined
  if (input.portAccessStatus === 'TENDER_REQUIRED') {
    firstTender = resolveTenderTime(
      input.firstTender,
      input.localDate,
      input.timeZone,
      'firstTenderTime',
      'First tender',
      issues,
    )
    tenderReport = resolveTenderTime(
      input.tenderReport,
      input.localDate,
      input.timeZone,
      'tenderReportTime',
      'Tender report',
      issues,
    )
    ourTenderAshore = resolveTenderTime(
      input.ourTenderAshore,
      input.localDate,
      input.timeZone,
      'ourTenderAshoreTime',
      'Our tender ashore',
      issues,
    )
    ourTenderBack = resolveTenderTime(
      input.ourTenderBack,
      input.localDate,
      input.timeZone,
      'ourTenderBackTime',
      'Our tender back',
      issues,
    )
    lastTender = resolveTenderTime(
      input.lastTender,
      input.localDate,
      input.timeZone,
      'lastTenderTime',
      'Last tender back',
      issues,
    )
    crossingMinutes = positiveWholeMinutes(
      input.tenderCrossingMinutes,
      MAX_TENDER_CROSSING_MINUTES,
      'tenderCrossingMinutes',
      'Tender crossing duration',
      issues,
    )

    if (
      firstTender !== undefined &&
      arrival !== undefined &&
      firstTender < arrival
    ) {
      addIssue(
        issues,
        'ERROR',
        'firstTenderTime',
        `First tender cannot be before ship arrival at ${input.arrivalTime}.`,
      )
    }
    if (
      firstTender !== undefined &&
      departure !== undefined &&
      firstTender > departure
    ) {
      addIssue(
        issues,
        'ERROR',
        'firstTenderTime',
        `First tender cannot be after ship departure at ${input.departureTime}.`,
      )
    }
    if (
      tenderReport !== undefined &&
      ourTenderAshore !== undefined &&
      tenderReport > ourTenderAshore
    ) {
      addIssue(
        issues,
        'ERROR',
        'tenderReportTime',
        `Tender report cannot be after our tender ashore at ${input.ourTenderAshore.time}.`,
      )
    }
    if (
      ourTenderAshore !== undefined &&
      firstTender !== undefined &&
      ourTenderAshore < firstTender
    ) {
      addIssue(
        issues,
        'ERROR',
        'ourTenderAshoreTime',
        `Our tender ashore cannot be before the first tender at ${input.firstTender.time}.`,
      )
    }
    if (
      lastTender !== undefined &&
      arrival !== undefined &&
      lastTender < arrival
    ) {
      addIssue(
        issues,
        'ERROR',
        'lastTenderTime',
        `Last tender cannot be before ship arrival at ${input.arrivalTime}.`,
      )
    }
    if (
      lastTender !== undefined &&
      departure !== undefined &&
      lastTender > departure
    ) {
      addIssue(
        issues,
        'ERROR',
        'lastTenderTime',
        `Last tender cannot be after ship departure at ${input.departureTime}.`,
      )
    }
    if (
      firstTender !== undefined &&
      lastTender !== undefined &&
      firstTender > lastTender
    ) {
      addIssue(
        issues,
        'ERROR',
        'firstTenderTime',
        'First tender cannot be after the last tender.',
      )
    }
    if (
      ourTenderAshore !== undefined &&
      lastTender !== undefined &&
      ourTenderAshore > lastTender
    ) {
      addIssue(
        issues,
        'ERROR',
        'ourTenderAshoreTime',
        `Our tender ashore cannot be after the last tender at ${input.lastTender.time}.`,
      )
    }
    if (
      ourTenderAshore !== undefined &&
      departure !== undefined &&
      ourTenderAshore > departure
    ) {
      addIssue(
        issues,
        'ERROR',
        'ourTenderAshoreTime',
        `Our tender ashore cannot be after ship departure at ${input.departureTime}.`,
      )
    }
    if (
      ourTenderBack !== undefined &&
      arrival !== undefined &&
      ourTenderBack < arrival
    ) {
      addIssue(
        issues,
        'ERROR',
        'ourTenderBackTime',
        `Our tender back cannot be before ship arrival at ${input.arrivalTime}.`,
      )
    }
    if (
      ourTenderBack !== undefined &&
      lastTender !== undefined &&
      ourTenderBack > lastTender
    ) {
      addIssue(
        issues,
        'ERROR',
        'ourTenderBackTime',
        `Our tender back cannot be after the last tender at ${input.lastTender.time}.`,
      )
    }
    if (
      ourTenderBack !== undefined &&
      allAboard !== undefined &&
      (lastTender === undefined || allAboard < lastTender) &&
      ourTenderBack > allAboard
    ) {
      addIssue(
        issues,
        'ERROR',
        'ourTenderBackTime',
        `Our tender back cannot be after All Aboard at ${input.allAboardTime}.`,
      )
    }
    if (
      ourTenderBack !== undefined &&
      departure !== undefined &&
      ourTenderBack > departure
    ) {
      addIssue(
        issues,
        'ERROR',
        'ourTenderBackTime',
        `Our tender back cannot be after ship departure at ${input.departureTime}.`,
      )
    }
    if (
      allAboard !== undefined &&
      lastTender !== undefined &&
      allAboard > lastTender
    ) {
      addIssue(
        issues,
        'WARNING',
        'lastTenderTime',
        'Last tender is earlier than All Aboard. Plan to use the last tender time.',
      )
    }

    const returnDeadline = [
      lastTender,
      allAboard,
      departure,
    ].filter((value): value is number => value !== undefined)
      .sort((left, right) => left - right)[0]
    if (
      ourTenderBack !== undefined &&
      returnDeadline !== undefined &&
      ourTenderBack <= returnDeadline
    ) {
      const bufferMinutes = Math.floor(
        (returnDeadline - ourTenderBack) / 60_000,
      )
      if (
        bufferMinutes > 0 &&
        bufferMinutes <
          RETURN_BUFFER_THRESHOLDS.INDEPENDENT.limitedMinutes
      ) {
        addIssue(
          issues,
          'WARNING',
          'ourTenderBackTime',
          `Only ${bufferMinutes} minutes remain before the tender return deadline.`,
        )
      }
    }
  }

  for (const excursion of input.excursions) {
    if (excursion.status === 'CANCELLED') {
      continue
    }
    const meetingField = excursionField(excursion.id, 'meetingTime')
    const startField = excursionField(excursion.id, 'startTime')
    const endField = excursionField(excursion.id, 'endTime')
    const travelField = excursionField(
      excursion.id,
      'travelDurationMinutes',
    )
    const meeting = resolveTime(
      input.localDate,
      excursion.meetingTime,
      excursion.timeZone,
      meetingField,
      `${excursion.id} meeting/check-in`,
      issues,
    )
    const start = resolveTime(
      input.localDate,
      excursion.startTime,
      excursion.timeZone,
      startField,
      `${excursion.id} start`,
      issues,
    )
    const end = resolveTime(
      input.localDate,
      excursion.endTime,
      excursion.timeZone,
      endField,
      `${excursion.id} end/return`,
      issues,
    )
    const travelMinutes =
      excursion.bookingType === 'INDEPENDENT'
        ? positiveWholeMinutes(
            excursion.travelDurationMinutes,
            MAX_EXCURSION_TRAVEL_MINUTES,
            travelField,
            'Estimated travel duration',
            issues,
          )
        : undefined

    if (
      meeting !== undefined &&
      start !== undefined &&
      start < meeting
    ) {
      addIssue(
        issues,
        'ERROR',
        startField,
        `Excursion start cannot be before the meeting time at ${excursion.meetingTime}.`,
      )
    }
    if (
      start !== undefined &&
      end !== undefined &&
      end <= start
    ) {
      addIssue(
        issues,
        'ERROR',
        endField,
        'Excursion return cannot be before the excursion start.',
      )
    }
    if (
      end !== undefined &&
      departure !== undefined &&
      end > departure
    ) {
      addIssue(
        issues,
        'ERROR',
        endField,
        `Excursion return cannot be after ship departure at ${input.departureTime}.`,
      )
    }
    if (
      end !== undefined &&
      allAboard !== undefined &&
      end > allAboard
    ) {
      addIssue(
        issues,
        'ERROR',
        endField,
        `Excursion return cannot be after All Aboard at ${input.allAboardTime}.`,
      )
    }
    if (
      input.portAccessStatus === 'TENDER_REQUIRED' &&
      end !== undefined &&
      lastTender !== undefined &&
      end > lastTender
    ) {
      addIssue(
        issues,
        'ERROR',
        endField,
        `Excursion return cannot be after the last tender at ${input.lastTender.time}.`,
      )
    }

    if (
      end !== undefined &&
      allAboard !== undefined &&
      end <= allAboard
    ) {
      const bufferMinutes = Math.floor((allAboard - end) / 60_000)
      const threshold =
        excursion.bookingType === 'INDEPENDENT'
          ? RETURN_BUFFER_THRESHOLDS.INDEPENDENT.limitedMinutes
          : RETURN_BUFFER_THRESHOLDS.OCEANIA.limitedMinutes
      if (bufferMinutes < threshold) {
        addIssue(
          issues,
          'WARNING',
          endField,
          `Only ${bufferMinutes} minutes remain before All Aboard.`,
        )
      }
    }

    if (
      excursion.bookingType === 'INDEPENDENT' &&
      tenderReport !== undefined &&
      ourTenderAshore !== undefined &&
      crossingMinutes !== undefined &&
      meeting !== undefined
    ) {
      const arrivalAshore =
        ourTenderAshore + crossingMinutes * 60_000
      if (arrivalAshore > meeting) {
        addIssue(
          issues,
          'ERROR',
          meetingField,
          'Tender arrival would be after the excursion meeting time.',
        )
        continue
      }
      if (travelMinutes === undefined) {
        continue
      }
      const calculatedArrival =
        arrivalAshore + travelMinutes * 60_000
      const bufferMinutes = Math.floor(
        (meeting - calculatedArrival) / 60_000,
      )
      const warningThreshold =
        excursion.safetyBufferMinutes ??
        TIGHT_CONNECTION_WARNING_MINUTES
      if (bufferMinutes < 0) {
        addIssue(
          issues,
          'ERROR',
          meetingField,
          'Tender arrival would be after the excursion meeting time.',
        )
      } else if (bufferMinutes < warningThreshold) {
        addIssue(
          issues,
          'WARNING',
          meetingField,
          bufferMinutes === 0
            ? 'Tender arrival reaches the excursion meeting time with no buffer.'
            : `Only ${bufferMinutes} minutes remain between tender arrival and the excursion meeting time.`,
        )
      }
    }
  }

  return {
    errors: issues.filter(({ severity }) => severity === 'ERROR'),
    issues,
    warnings: issues.filter(({ severity }) => severity === 'WARNING'),
  }
}
