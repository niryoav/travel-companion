import { effectiveAllAboard } from '../../../domain/trip/allAboardPlanning'
import { formatLocalTime } from '../../../domain/trip/tripTime'
import type {
  PortCall,
  TripData,
  TripEvent,
} from '../../../domain/trip/tripTypes'
import type { SimulationScenario } from '../../simulation/simulationScenarios'
import { selectDocumentAction } from '../../documents/selectors/selectDocumentsViewModel'
import type {
  TodayEventViewModel,
  TodayViewModel,
} from '../todayTypes'

function requiredEvent(data: TripData, id: string): TripEvent {
  const event = data.events.find((candidate) => candidate.id === id)
  if (!event) {
    throw new Error(`Missing simulation event ${id}`)
  }
  return event
}

function requiredPortCall(data: TripData, id: string): PortCall {
  const portCall = data.portCalls.find((candidate) => candidate.id === id)
  if (!portCall) {
    throw new Error(`Missing simulation port call ${id}`)
  }
  return portCall
}

function time(
  instant: string | undefined,
  timeZone: string | undefined,
): string | undefined {
  return instant && timeZone
    ? formatLocalTime(instant, timeZone)
    : undefined
}

function locationName(data: TripData, event: TripEvent): string | undefined {
  return data.locations.find(({ id }) => id === event.locationId)?.name
}

function kindLabel(event: TripEvent): string {
  switch (event.kind) {
    case 'FLIGHT':
      return 'Flight'
    case 'TRANSFER':
      return 'Transfer'
    case 'HOTEL_STAY':
      return 'Hotel'
    case 'EMBARKATION':
      return 'Boarding'
    case 'EXCURSION':
      return 'Excursion'
    case 'MEAL':
      return 'Dining'
    case 'ACTIVITY':
      return 'Activity'
    case 'DISEMBARKATION':
      return 'Disembarkation'
  }
}

function documentActions(data: TripData, event: TripEvent) {
  return event.documentReferenceIds?.flatMap((documentId) => {
    const document = data.documentReferences.find(({ id }) => id === documentId)
    return document ? [selectDocumentAction(document)] : []
  })
}

function eventView(
  data: TripData,
  event: TripEvent,
  values: Partial<TodayEventViewModel> = {},
): TodayEventViewModel {
  const eventTimeZone = event.timeZone
  const actions = documentActions(data, event)
  const timingConfidenceLabel =
    event.scheduleStatus === 'TO_BE_CONFIRMED'
      ? event.startsAt
        ? 'TBC'
        : undefined
      : event.timingVerification === 'ESTIMATED'
        ? 'Estimated'
        : undefined

  return {
    id: event.id,
    kindLabel: kindLabel(event),
    publicCode: event.publicCode,
    title: event.title,
    state:
      !event.startsAt && event.scheduleStatus === 'TO_BE_CONFIRMED'
        ? 'UNTIMED'
        : 'UPCOMING',
    stateLabel:
      !event.startsAt && event.scheduleStatus === 'TO_BE_CONFIRMED'
        ? 'Needs confirmation'
        : 'Later',
    time: time(event.startsAt, eventTimeZone),
    timingLabel:
      !event.startsAt && event.scheduleStatus === 'TO_BE_CONFIRMED'
        ? 'TBC'
        : undefined,
    startsAt: event.startsAt,
    endTime: time(event.endsAt, eventTimeZone),
    endsAt: event.endsAt,
    location: locationName(data, event),
    meetingTime: time(event.checkInAt ?? event.meetingAt, eventTimeZone),
    meetingAt: event.checkInAt ?? event.meetingAt,
    meetingPointLabel: event.meetingContext,
    timingConfidenceLabel,
    operationalNotes: event.operationalNotes,
    localOperationalNote: event.localOperationalNote,
    hasRelatedDocuments: Boolean(actions?.length),
    documentActions: actions,
    ...values,
  }
}

function derivedEvent(
  event: TripEvent,
  id: string,
  title: string,
  instant: string | undefined,
  values: Partial<TodayEventViewModel> = {},
): TodayEventViewModel {
  return {
    id,
    kindLabel: values.kindLabel ?? kindLabel(event),
    title,
    state: values.state ?? 'UPCOMING',
    stateLabel: values.stateLabel ?? 'Later',
    time: time(instant, event.timeZone),
    startsAt: instant,
    hasRelatedDocuments: false,
    ...values,
  }
}

export function createTodaySimulationScenarios(
  data: TripData,
): Record<SimulationScenario, TodayViewModel> {
  const homeTransfer = requiredEvent(data, 'event-home-brussels-transfer')
  const outboundFlight = requiredEvent(data, 'event-outbound-flight')
  const flybus = requiredEvent(data, 'event-keflavik-hotel-transfer')
  const hotel = requiredEvent(data, 'event-hotel-viking-stay')
  const hotelTransfer = requiredEvent(data, 'event-hotel-ship-transfer')
  const embarkation = requiredEvent(data, 'event-embarkation')
  const embarkationLunch = requiredEvent(data, 'event-embarkation-lunch')
  const embarkationPort = requiredPortCall(data, 'port-call-reykjavik')
  const outboundTenderReport = requiredEvent(
    data,
    'event-husavik-outbound-tender-report',
  )
  const outboundTenderDeparture = requiredEvent(
    data,
    'event-husavik-outbound-tender-departure',
  )
  const shoreArrival = requiredEvent(
    data,
    'event-husavik-shore-arrival',
  )
  const whaleSafari = requiredEvent(data, 'event-husavik-big-whale-safari')
  const whaleBoarding = requiredEvent(data, 'event-husavik-whale-boarding')
  const geosea = requiredEvent(data, 'event-husavik-geosea-baths')
  const returnTenderBoarding = requiredEvent(
    data,
    'event-husavik-return-tender-boarding',
  )
  const returnTenderDeparture = requiredEvent(
    data,
    'event-husavik-return-tender-departure',
  )
  const backOnboard = requiredEvent(data, 'event-husavik-back-onboard')
  const lastTender = requiredEvent(data, 'event-husavik-last-tender')
  const toscana = requiredEvent(data, 'event-toscana-dinner')
  const husavikPort = requiredPortCall(data, 'port-call-husavik')
  const husavikAllAboard = effectiveAllAboard(data, husavikPort)
  const redGinger = requiredEvent(data, 'event-red-ginger-dinner')
  const breakfastOpens = requiredEvent(
    data,
    'event-disembarkation-breakfast',
  )
  const cabinVacate = requiredEvent(
    data,
    'event-disembarkation-cabin-vacate',
  )
  const disembarkationGroup = requiredEvent(
    data,
    'event-disembarkation-group',
  )
  const disembarkation = requiredEvent(data, 'event-disembarkation')
  const homeboundTransfer = requiredEvent(
    data,
    'event-southampton-heathrow-transfer',
  )
  const heathrowArrival = requiredEvent(
    data,
    'event-heathrow-arrival-estimate',
  )
  const heathrowBagDrop = requiredEvent(data, 'event-heathrow-bag-drop')
  const heathrowSecurity = requiredEvent(data, 'event-heathrow-security')
  const returnFlight = requiredEvent(data, 'event-return-flight')
  const southamptonPort = requiredPortCall(data, 'port-call-southampton')

  const departureTimeline = [
    eventView(data, homeTransfer, {
      title: 'Leave home with Anaïs',
      state: 'NEXT',
      stateLabel: 'Next',
      location: 'Home · Ghent',
      localOperationalNote: 'Arrive at Brussels Airport at 11:30.',
    }),
    derivedEvent(
      homeTransfer,
      'event-arrive-brussels-airport',
      'Arrive at Brussels Airport',
      homeTransfer.endsAt,
      { kindLabel: 'Airport', location: 'Brussels Airport' },
    ),
    eventView(data, outboundFlight, {
      title: 'FI555 departs',
      publicCode: 'FI555',
    }),
    derivedEvent(
      outboundFlight,
      'event-arrive-keflavik',
      'Arrive at Keflavík',
      outboundFlight.endsAt,
      { kindLabel: 'Flight', location: 'Keflavík Airport' },
    ),
    eventView(data, flybus, {
      title: 'Take Flybus outside Arrivals',
      timingLabel: 'After baggage',
      time: undefined,
      startsAt: undefined,
      location: 'Outside the Arrivals exit',
      localOperationalNote:
        'Flybus leaves according to arriving flights; no exact departure is confirmed.',
    }),
    eventView(data, hotel, {
      title: 'Hotel check-in available',
      stateLabel: 'From 16:00',
      location: 'Hotel Viking · Strandgata 55, Hafnarfjörður',
    }),
  ]

  const embarkationTimeline: TodayEventViewModel[] = [
    derivedEvent(
      hotel,
      'event-hotel-checkout',
      'Hotel checkout deadline',
      hotel.endsAt,
      { kindLabel: 'Hotel', location: 'Hotel Viking' },
    ),
    eventView(data, hotelTransfer, {
      title: 'Taxi pickup from Hotel Viking',
      state: 'NEXT',
      stateLabel: 'Next · Estimated',
      location: 'Hotel Viking lobby',
      localOperationalNote: 'Estimated and editable in Trip.',
    }),
    derivedEvent(
      hotelTransfer,
      'event-cruise-terminal-arrival',
      'Expected arrival at cruise terminal',
      hotelTransfer.endsAt,
      {
        kindLabel: 'Transfer',
        stateLabel: 'Estimated',
        location: 'Marina cruise terminal, Reykjavík · exact berth TBC',
      },
    ),
    eventView(data, embarkation, {
      title: 'Boarding starts',
      stateLabel: 'Confirmed',
      location: 'Marina cruise terminal, Reykjavík · exact berth TBC',
    }),
    eventView(data, embarkationLunch, {
      stateLabel: 'Estimated',
      localOperationalNote: 'Planning intention after boarding.',
    }),
    {
      id: 'event-marina-departure',
      kindLabel: 'Ship',
      title: 'Marina departs',
      state: 'UPCOMING',
      stateLabel: 'Later',
      time: time(embarkationPort.departureAt, embarkationPort.timeZone),
      startsAt: embarkationPort.departureAt,
      hasRelatedDocuments: false,
    },
  ]

  const checkIn = derivedEvent(
    whaleSafari,
    'event-husavik-whale-check-in',
    'Check in at Gentle Giants',
    whaleSafari.checkInAt,
    {
      kindLabel: 'Check-in',
      state: 'NEXT',
      stateLabel: 'Next',
      location: whaleSafari.meetingContext,
      hasRelatedDocuments: Boolean(whaleSafari.documentReferenceIds?.length),
      documentActions: documentActions(data, whaleSafari),
    },
  )
  const husavikTimeline: TodayEventViewModel[] = [
    {
      id: 'event-husavik-ship-arrival',
      kindLabel: 'Ship',
      title: 'Ship arrives',
      state: 'UPCOMING',
      stateLabel: 'Confirmed',
      time: time(husavikPort.arrivalAt, husavikPort.timeZone),
      startsAt: husavikPort.arrivalAt,
      hasRelatedDocuments: false,
    },
    eventView(data, outboundTenderReport),
    eventView(data, outboundTenderDeparture),
    eventView(data, shoreArrival),
    checkIn,
    eventView(data, whaleBoarding, {
      stateLabel: 'Confirmed',
      location: whaleBoarding.meetingContext,
    }),
    eventView(data, whaleSafari, {
      title: 'Whale safari departs',
      stateLabel: 'Confirmed',
      endTime: undefined,
      endsAt: undefined,
      meetingTime: undefined,
      meetingAt: undefined,
      meetingPointLabel: undefined,
      localOperationalNote: undefined,
    }),
    derivedEvent(
      whaleSafari,
      'event-husavik-whale-finish',
      'Whale safari finishes',
      whaleSafari.endsAt,
      {
        state: whaleSafari.endsAt ? 'UPCOMING' : 'UNTIMED',
        stateLabel:
          whaleSafari.endsAt ? 'Estimated' : 'Needs confirmation',
        timingLabel: whaleSafari.endsAt ? undefined : 'TBC',
        timingConfidenceLabel: whaleSafari.endsAt
          ? whaleSafari.timingVerification === 'CONFIRMED'
            ? undefined
            : 'Estimated'
          : undefined,
      },
    ),
    derivedEvent(
      geosea,
      'event-husavik-geosea-report',
      'Report for GeoSea excursion',
      geosea.meetingAt,
      {
        kindLabel: 'Reporting',
        state: geosea.meetingAt ? 'UPCOMING' : 'UNTIMED',
        stateLabel:
          geosea.meetingAt ? 'Confirmed' : 'Needs confirmation',
        timingLabel: geosea.meetingAt ? undefined : 'TBC',
        location: geosea.meetingContext,
      },
    ),
    eventView(data, geosea, {
      title: 'GeoSea excursion starts',
      stateLabel: 'Confirmed',
      endTime: undefined,
      endsAt: undefined,
      meetingTime: undefined,
      meetingAt: undefined,
      meetingPointLabel: undefined,
    }),
    derivedEvent(
      geosea,
      'event-husavik-geosea-finish',
      'GeoSea excursion finishes',
      geosea.endsAt,
      { kindLabel: 'Excursion', stateLabel: 'Confirmed' },
    ),
    eventView(data, returnTenderBoarding),
    eventView(data, returnTenderDeparture),
    eventView(data, backOnboard),
    eventView(data, lastTender),
    {
      id: 'event-husavik-all-aboard',
      kindLabel: 'Ship',
      title:
        husavikAllAboard?.verification === 'CONFIRMED'
          ? 'All Aboard'
          : husavikAllAboard
            ? 'All Aboard estimate'
            : 'All Aboard',
      state: husavikAllAboard ? 'UPCOMING' : 'UNTIMED',
      stateLabel:
        husavikAllAboard?.verification === 'CONFIRMED'
          ? 'Confirmed'
          : 'TBC',
      time: time(husavikAllAboard?.at, husavikPort.timeZone),
      startsAt: husavikAllAboard?.at,
      timingLabel: husavikAllAboard ? undefined : 'TBC',
      timingConfidenceLabel:
        husavikAllAboard?.verification === 'ESTIMATED'
          ? 'Planning estimate from ship departure minus 30 minutes; confirm onboard.'
          : undefined,
      hasRelatedDocuments: false,
    },
    {
      id: 'event-husavik-ship-departure',
      kindLabel: 'Ship',
      title: 'Ship departs',
      state: 'UPCOMING',
      stateLabel: 'Confirmed',
      time: time(husavikPort.departureAt, husavikPort.timeZone),
      startsAt: husavikPort.departureAt,
      hasRelatedDocuments: false,
    },
    eventView(data, toscana, {
      stateLabel: 'Confirmed',
      location: 'Toscana · shared table',
    }),
  ]

  const disembarkationTimeline: TodayEventViewModel[] = [
    {
      id: 'event-marina-arrival-southampton',
      kindLabel: 'Ship',
      title: 'Marina scheduled arrival',
      state: 'UPCOMING',
      stateLabel: 'Confirmed',
      time: time(southamptonPort.arrivalAt, southamptonPort.timeZone),
      startsAt: southamptonPort.arrivalAt,
      hasRelatedDocuments: false,
    },
    eventView(data, breakfastOpens),
    eventView(data, cabinVacate),
    eventView(data, disembarkationGroup),
    eventView(data, disembarkation),
    eventView(data, homeboundTransfer, {
      stateLabel: 'Confirmed',
      location: 'Passenger exit at the actual terminal or berth',
    }),
    eventView(data, heathrowArrival, {
      stateLabel: 'Estimated',
      location: 'Heathrow Terminal 5',
    }),
    eventView(data, heathrowBagDrop),
    eventView(data, heathrowSecurity),
    eventView(data, returnFlight, {
      title: 'BA386 departs for Brussels',
      stateLabel: 'Confirmed',
      location: 'Heathrow Terminal 5',
    }),
    derivedEvent(
      returnFlight,
      'event-arrive-brussels',
      'BA386 arrives in Brussels',
      returnFlight.endsAt,
      {
        kindLabel: 'Flight',
        location: 'Brussels Airport',
        time: time(returnFlight.endsAt, returnFlight.endTimeZone),
      },
    ),
  ]

  return {
    'before-departure': {
      state: 'ACTIVE_DAY',
      dayKind: 'DEPARTURE_DAY',
      header: {
        eyebrow: 'Departure day preview',
        title: 'Travel to Reykjavík',
        summary: 'Ghent → Brussels Airport → Keflavík → Hafnarfjörður',
        date: 'Saturday, 22 August 2026',
        dateTime: '2026-08-22',
      },
      timeline: departureTimeline,
      weather: {
        location: 'Ghent and Brussels',
        condition: 'Cool with passing showers',
        temperature: '17°C',
        rainChance: 'Rain chance 55%',
        implication: 'Keep a light rain layer accessible during the airport transfer.',
      },
      additionalWeather: [
        {
          location: 'Keflavík and Hafnarfjörður',
          condition: 'Cold, windy showers',
          temperature: '11°C',
          feelsLike: 'Feels like 7°C',
          wind: 'Strong coastal wind possible',
          rainChance: 'Rain chance 65%',
          implication:
            'Keep a waterproof windproof layer in hand luggage and put it on before leaving Arrivals; exposed transfer roads may run more slowly.',
        },
      ],
      preparation: {
        take: ['Passports and flight essentials', 'Medication and chargers'],
        dress: ['Comfortable travel layers', 'Light rain layer within reach'],
      },
      priorities: [
        {
          id: 'departure-flybus',
          level: 'INFORMATION',
          title: 'Flybus has no fixed departure time',
          detail: 'Collect baggage, then use the boarding point outside Arrivals.',
          documentAction: documentActions(data, flybus)?.[0],
        },
      ],
    },
    'embarkation-day': {
      state: 'ACTIVE_DAY',
      dayKind: 'PORT_DAY',
      header: {
        eyebrow: 'Embarkation day',
        title: 'Board Oceania Marina',
        summary: 'Hotel Viking → Reykjavík cruise terminal',
        date: 'Sunday, 23 August 2026',
        dateTime: '2026-08-23',
      },
      timeline: embarkationTimeline,
      weather: {
        location: 'Reykjavík',
        condition: 'Breezy with light showers',
        temperature: '12°C',
        wind: 'Wind 25 km/h',
        implication: 'Wear a waterproof outer layer for the terminal transfer.',
      },
      preparation: {
        take: ['Passports', 'Cruise boarding documents', 'Medication in hand luggage'],
        dress: ['Comfortable travel layers', 'Waterproof outer layer'],
      },
      priorities: [
        {
          id: 'embarkation-berth',
          level: 'ATTENTION',
          title: 'Exact berth is still TBC',
          detail: 'Confirm the Marina terminal before the taxi leaves.',
        },
      ],
    },
    'tender-port-day': {
      state: 'ACTIVE_DAY',
      dayKind: 'PORT_DAY',
      header: {
        eyebrow: 'Port day · Tender',
        title: 'Húsavík',
        summary: 'Two excursions with a tight handover',
        date: 'Tuesday, 25 August 2026',
        dateTime: '2026-08-25',
      },
      timeline: husavikTimeline,
      weather: {
        location: 'Húsavík',
        condition: 'Cold, windy showers',
        temperature: '8°C',
        feelsLike: 'Feels like 4°C',
        wind: 'Wind 30 km/h',
        rainChance: 'Rain chance 70%',
        seaCondition: 'Choppy small-boat conditions possible',
        implication:
          'Wear warm waterproof layers and protect the camera or phone from spray.',
      },
      preparation: {
        breakfastActions: ['Prepare lunch boxes', 'Fill drink bottles'],
        take: [
          'Binoculars',
          'Filled drink bottles and lunch boxes',
          'Compact day bag',
          'Camera or phone with rain protection',
          'Swimsuit and towel for GeoSea',
          'Seasickness medication if personally needed',
        ],
        dress: [
          'Warm layers and waterproof jacket',
          'Closed waterproof or non-slip shoes',
          'Hat and gloves',
        ],
        provided: [
          'Warm flotation overalls',
          'Rain protection if required',
          'GeoSea lockers and private showers',
        ],
      },
    },
    'sea-day': {
      state: 'ACTIVE_DAY',
      dayKind: 'SEA_DAY',
      header: {
        eyebrow: 'Sea day',
        title: 'At sea',
        summary: 'A calm day aboard Oceania Marina',
        date: 'Friday, 28 August 2026',
        dateTime: '2026-08-28',
      },
      timeline: [
        eventView(data, redGinger, {
          state: 'NEXT',
          stateLabel: 'Confirmed',
          location: 'Red Ginger · shared table',
        }),
      ],
      weather: {
        location: 'At sea',
        condition: 'Cool and breezy',
        temperature: '11°C',
        wind: 'Wind 28 km/h',
        seaCondition: 'Moderate movement',
        implication: 'Take a warm layer for time on open decks.',
      },
    },
    'disembarkation-day': {
      state: 'ACTIVE_DAY',
      dayKind: 'FINAL_TRAVEL_DAY',
      header: {
        eyebrow: 'Disembarkation day',
        title: 'Journey home',
        summary: 'Southampton → Heathrow → Brussels',
        date: 'Friday, 4 September 2026',
        dateTime: '2026-09-04',
      },
      timeline: disembarkationTimeline,
      weather: {
        location: 'Southampton',
        condition: 'Cloudy with possible rain',
        temperature: '15°C',
        rainChance: 'Rain chance 45%',
        implication: 'Keep a light rain layer accessible for the terminal pickup.',
      },
      additionalWeather: [
        {
          location: 'Brussels arrival',
          condition: 'Mild with a chance of showers',
          temperature: '18°C',
          rainChance: 'Rain chance 40%',
          implication:
            'Keep the light rain layer accessible until the journey home is complete.',
        },
      ],
      preparation: {
        take: [
          'Passports, medication and valuables',
          'Transfer confirmation',
          'Flight essentials in hand luggage',
        ],
        dress: ['Comfortable travel layers', 'Light rain layer within reach'],
      },
      priorities: [
        {
          id: 'disembarkation-transfer-document',
          level: 'ACTION',
          title: 'Keep the transfer confirmation ready',
          detail: 'The provider will confirm the actual terminal or berth.',
          documentAction: documentActions(data, homeboundTransfer)?.[0],
        },
      ],
    },
  }
}
