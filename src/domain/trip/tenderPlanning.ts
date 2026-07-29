import type {
  OperationalTime,
  TenderOperations,
} from './tripTypes'

export function expectedArrivalAshore(
  tender: TenderOperations | undefined,
): OperationalTime | undefined {
  if (
    !tender?.ourTenderAshore?.at ||
    tender.crossingMinutes === undefined
  ) {
    return undefined
  }

  const departure = Date.parse(tender.ourTenderAshore.at)
  if (!Number.isFinite(departure)) {
    return undefined
  }

  return {
    at: new Date(
      departure + tender.crossingMinutes * 60_000,
    ).toISOString(),
    verification: 'ESTIMATED',
  }
}
