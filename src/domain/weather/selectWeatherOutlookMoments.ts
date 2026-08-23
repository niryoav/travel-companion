import type { PortCall, TripData, TripDay } from '../trip/tripTypes.js'
import { selectDayEvents } from '../trip/selectors/selectDayEvents.js'

export interface WeatherOutlookMoment {
  label: string
  /** ISO 8601 instant (UTC). */
  at: string
}

const MAX_MOMENTS = 3
const MIN_GAP_MS = 30 * 60_000

/**
 * Picks a handful of practically important outdoor moments today (transfer
 * departure, excursion start, tender movement, return to ship) so Today can
 * show a short, targeted weather outlook instead of a full hourly table.
 */
export function selectWeatherOutlookMoments(
  data: TripData,
  day: TripDay,
  portCall: PortCall | null,
): WeatherOutlookMoment[] {
  const candidates: WeatherOutlookMoment[] = []

  for (const event of selectDayEvents(data, day)) {
    if (!event.startsAt || event.operationalStatus === 'CANCELLED') {
      continue
    }
    if (event.kind === 'TRANSFER') {
      candidates.push({ label: `${event.title} departs`, at: event.startsAt })
    } else if (event.kind === 'EXCURSION') {
      candidates.push({ label: `${event.title} starts`, at: event.startsAt })
    }
  }

  const tender = portCall?.portAccess?.tender
  if (tender?.ourTenderAshore?.at) {
    candidates.push({ label: 'Tender ashore', at: tender.ourTenderAshore.at })
  }
  if (tender?.ourTenderBack?.at) {
    candidates.push({ label: 'Tender back', at: tender.ourTenderBack.at })
  }
  if (portCall?.allAboardAt) {
    candidates.push({ label: 'Return to ship', at: portCall.allAboardAt })
  }

  const sorted = [...candidates].sort(
    (left, right) => Date.parse(left.at) - Date.parse(right.at),
  )
  const deduped = sorted.filter((moment, index) => {
    if (index === 0) {
      return true
    }
    return (
      Date.parse(moment.at) - Date.parse(sorted[index - 1].at) > MIN_GAP_MS
    )
  })

  return deduped.slice(0, MAX_MOMENTS)
}
