import type {
  OperationalEntryStatus,
  PortCall,
  TripData,
} from './tripTypes'

export const ESTIMATED_ALL_ABOARD_LEAD_MINUTES = 30

export interface EffectiveAllAboard {
  at: string
  verification: OperationalEntryStatus
}

function estimatedAllAboard(
  data: TripData,
  portCall: PortCall,
): EffectiveAllAboard | undefined {
  const day = data.days.find(({ id }) => id === portCall.dayId)
  const cruise = data.cruises.find(
    ({ id }) => id === data.trip.cruiseId,
  )
  if (
    !day ||
    !cruise ||
    day.kind !== 'PORT_DAY' ||
    !cruise.portCallIds.includes(portCall.id) ||
    day.localDate === cruise.embarkationDate ||
    day.localDate === cruise.disembarkationDate ||
    !portCall.departureAt
  ) {
    return undefined
  }

  const departure = Date.parse(portCall.departureAt)
  if (!Number.isFinite(departure)) {
    return undefined
  }

  return {
    at: new Date(
      departure - ESTIMATED_ALL_ABOARD_LEAD_MINUTES * 60_000,
    ).toISOString(),
    verification: 'ESTIMATED',
  }
}

export function effectiveAllAboard(
  data: TripData,
  portCall: PortCall,
): EffectiveAllAboard | undefined {
  if (portCall.allAboardAt) {
    return {
      at: portCall.allAboardAt,
      verification:
        portCall.allAboardVerification ?? 'CONFIRMED',
    }
  }
  if (portCall.allAboardVerification === 'TO_BE_CONFIRMED') {
    return undefined
  }
  return estimatedAllAboard(data, portCall)
}

/**
 * Adds display-ready planning estimates without mutating the canonical bundle.
 * Local overrides should be applied first so an edited value or explicit TBC
 * status takes precedence over this derived fallback.
 */
export function withPlanningAllAboardEstimates(
  data: TripData,
): TripData {
  let changed = false
  const portCalls = data.portCalls.map((portCall) => {
    const allAboard = effectiveAllAboard(data, portCall)
    if (
      !allAboard ||
      (
        portCall.allAboardAt === allAboard.at &&
        portCall.allAboardVerification === allAboard.verification
      )
    ) {
      return portCall
    }
    changed = true
    return {
      ...portCall,
      allAboardAt: allAboard.at,
      allAboardVerification: allAboard.verification,
    }
  })

  return changed ? { ...data, portCalls } : data
}
