import { effectiveAllAboard } from '../../../domain/trip/allAboardPlanning'
import { formatLocalTime } from '../../../domain/trip/tripTime'
import type { TripData } from '../../../domain/trip/tripTypes'
import type { SimulationScenario } from '../../simulation/simulationScenarios'
import {
  CRUISE_DAY_TYPES,
  HOME_PHASES,
  type HomeViewModel,
} from '../homeTypes'

function event(data: TripData, id: string) {
  const value = data.events.find((candidate) => candidate.id === id)
  if (!value) {
    throw new Error(`Missing simulation event ${id}`)
  }
  return value
}

function eventTime(
  data: TripData,
  id: string,
  field: 'startsAt' | 'checkInAt' = 'startsAt',
) {
  const value = event(data, id)
  const instant = value[field]
  return instant && value.timeZone
    ? formatLocalTime(instant, value.timeZone)
    : undefined
}

function documentAction(data: TripData, id: string, label: string) {
  const document = data.documentReferences.find(
    (candidate) => candidate.id === id,
  )
  if (!document) {
    throw new Error(`Missing simulation document ${id}`)
  }

  return {
    id: document.id,
    href: document.assetPath,
    label,
    title: document.title,
    operationalNotice: document.operationalNotice,
  }
}

export function createHomeSimulationScenarios(
  data: TripData,
): Record<SimulationScenario, HomeViewModel> {
  const husavikPort = data.portCalls.find(
    ({ id }) => id === 'port-call-husavik',
  )
  if (!husavikPort) {
    throw new Error('Missing Húsavík simulation port call')
  }
  const husavikAllAboard = effectiveAllAboard(data, husavikPort)

  return {
    'before-departure': {
      phase: HOME_PHASES.PRE_TRIP,
      intro: 'Today starts your journey.',
      context: {
        eyebrow: 'Departure day preview',
        title: 'Travel to Reykjavík',
        summary: 'Ghent → Keflavík → Hafnarfjörður',
        tripDates: 'Saturday · 22 August 2026',
        countdown: 'Leave home at 10:30',
      },
      milestone: {
        icon: 'taxi',
        label: 'Next action',
        title: 'Leave home with Anaïs',
        time: eventTime(data, 'event-home-brussels-transfer'),
        dateTime: event(data, 'event-home-brussels-transfer').startsAt,
        detail: 'Arrive at Brussels Airport at 11:30',
        countdown: 'FI555 departs at 13:50',
      },
      weather: {
        icon: 'rain',
        location: 'Keflavík and Hafnarfjörður',
        temperature: '11°C',
        condition: 'Cool, windy showers',
        wind: 'Breezy after arrival',
        rain: 'Rain likely',
        implication: 'Keep a waterproof outer layer accessible.',
      },
      checklistTitle: 'Before leaving',
      checklist: [
        { label: 'Passports', complete: true },
        { label: 'Flight documents', complete: true },
      ],
      alert: {
        title: 'Keep passports and essentials in hand luggage',
        detail: 'Flybus leaves after baggage collection from outside Arrivals; no exact departure is confirmed.',
        documentAction: documentAction(
          data,
          'document-keflavik-reykjavik-flybus',
          'Open Flybus voucher',
        ),
      },
    },
    'embarkation-day': {
      phase: HOME_PHASES.DEPARTURE_DAY,
      intro: 'Boarding day in Reykjavík.',
      context: {
        eyebrow: 'Embarkation day',
        title: 'Board Oceania Marina',
        summary: 'Hotel Viking → Reykjavík cruise terminal',
        tripDates: 'Sunday · 23 August 2026',
      },
      milestone: {
        icon: 'taxi',
        label: 'Next action',
        title: 'Taxi pickup from Hotel Viking',
        time: eventTime(data, 'event-hotel-ship-transfer'),
        dateTime: event(data, 'event-hotel-ship-transfer').startsAt,
        detail: 'Estimated · exact berth TBC',
        countdown: 'Boarding starts at 13:00',
        tone: 'urgent',
      },
      weather: {
        icon: 'rain',
        location: 'Reykjavík',
        temperature: '12°C',
        condition: 'Breezy with light showers',
        wind: 'Waterproof outer layer recommended',
        implication: 'Keep the rain layer above the checked luggage.',
      },
      checklistTitle: 'Before checkout',
      checklist: [
        { label: 'Passports', complete: true },
        { label: 'Cruise documents', complete: true },
      ],
      alert: {
        title: 'Confirm the exact Marina berth',
        detail: 'Check before the taxi leaves at the estimated 12:00 pickup time.',
      },
    },
    'tender-port-day': {
      phase: HOME_PHASES.CRUISE,
      intro: 'A tender port with two excursions.',
      cruiseDayType: CRUISE_DAY_TYPES.PORT_DAY,
      portAccessStatus: 'TENDER_REQUIRED',
      context: {
        eyebrow: 'Port day · Tender',
        title: 'Húsavík',
        summary: 'Two excursions with a tight handover',
      },
      cruiseProgress: {
        day: 4,
        totalDays: 14,
        daysRemaining: 10,
      },
      milestone: {
        icon: 'tender',
        label: 'Next action',
        title: 'Check in at Gentle Giants',
        time: eventTime(
          data,
          'event-husavik-big-whale-safari',
          'checkInAt',
        ),
        dateTime: event(data, 'event-husavik-big-whale-safari').checkInAt,
        location: 'Gentle Giants Ticket Center',
        detail: 'Boarding and overalls at 09:05 · safari departs 09:30',
        countdown: 'Second excursion at 13:00',
        allAboardTime:
          husavikAllAboard?.at
            ? formatLocalTime(
                husavikAllAboard.at,
                husavikPort.timeZone,
              )
            : undefined,
        allAboardStatusLabel:
          husavikAllAboard?.verification === 'ESTIMATED'
            ? 'Estimate · TBC'
            : undefined,
        tone: 'urgent',
      },
      weather: {
        icon: 'rain',
        location: 'Húsavík',
        temperature: '8°C · feels like 4°C',
        condition: 'Cold, windy showers',
        wind: 'Warm waterproof layers',
        rain: 'Protect camera or phone from spray',
        implication: 'Wear warm waterproof layers ashore.',
      },
      checklistTitle: 'Take ashore',
      checklist: [
        { label: 'Lunch boxes' },
        { label: 'Filled drink bottles' },
      ],
      alert: {
        title: 'Last tender remains TBC',
        detail: 'Confirm it onboard before going ashore.',
      },
    },
    'sea-day': {
      phase: HOME_PHASES.CRUISE,
      intro: 'A calm day aboard Marina.',
      cruiseDayType: CRUISE_DAY_TYPES.SEA_DAY,
      context: {
        eyebrow: 'Sea day',
        title: 'At sea',
        summary: 'A calm day aboard Oceania Marina',
      },
      cruiseProgress: {
        day: 7,
        totalDays: 14,
        daysRemaining: 7,
      },
      milestone: {
        icon: 'dining',
        label: 'Confirmed plan',
        title: 'Red Ginger',
        time: eventTime(data, 'event-red-ginger-dinner'),
        dateTime: event(data, 'event-red-ginger-dinner').startsAt,
        detail: 'Shared table',
        countdown: 'Nothing urgent before dinner',
      },
      weather: {
        icon: 'wind',
        location: 'At sea',
        temperature: '11°C',
        condition: 'Cool and breezy',
        seaCondition: 'Take a warm layer on open decks',
        implication: 'A warm layer will help on open decks.',
      },
      checklistTitle: 'For this evening',
      checklist: [
        { label: 'Red Ginger reservation', complete: true },
        { label: 'Warm layer for open deck' },
      ],
    },
    'disembarkation-day': {
      phase: HOME_PHASES.FINAL_TRAVEL_DAY,
      intro: 'One clear route home.',
      context: {
        eyebrow: 'Disembarkation day',
        title: 'Journey home',
        summary: 'Southampton → Heathrow → Brussels',
        tripDates: 'Friday · 4 September 2026',
      },
      milestone: {
        icon: 'taxi',
        label: 'Next confirmed action',
        title: 'Private transfer to Heathrow',
        time: eventTime(data, 'event-southampton-heathrow-transfer'),
        dateTime: event(data, 'event-southampton-heathrow-transfer').startsAt,
        location: 'Passenger exit at the actual terminal',
        detail: 'Heathrow Terminal 5 · BA386 at 13:55',
        tone: 'urgent',
      },
      weather: {
        icon: 'rain',
        location: 'Brussels arrival',
        temperature: '18°C',
        condition: 'Mild with a chance of showers',
        rain: 'Rain chance 40%',
        implication: 'Keep the light rain layer accessible until home.',
      },
      checklistTitle: 'Keep with you',
      checklist: [
        { label: 'Passports', complete: true },
        { label: 'Transfer confirmation', complete: true },
      ],
      alert: {
        title: 'Keep passports, medication and valuables with you',
        detail: 'Confirm the cabin deadline, group and exact berth onboard.',
        documentAction: documentAction(
          data,
          'document-southampton-heathrow-transfer',
          'Open transfer confirmation',
        ),
      },
    },
  }
}
