import type {
  TripDayViewModel,
  TripProgressViewModel,
  TripViewModel,
} from '../tripTypes'

export const TRIP_REVIEW_STATES = [
  'pre-trip',
  'active',
  'port-day',
  'sea-day',
  'minimal',
  'completed',
  'cross-zone',
  'missing-data',
] as const

export type TripReviewState = (typeof TRIP_REVIEW_STATES)[number]

const activeProgress: TripProgressViewModel = {
  state: 'ACTIVE',
  label: 'Day 2 of 3',
  detail: '1 day completed',
  completedDays: 1,
  totalDays: 3,
  percentage: 33,
}

const baseDays: TripDayViewModel[] = [
  {
    id: 'review-day-departure',
    dayNumber: 1,
    kind: 'DEPARTURE_DAY',
    kindLabel: 'Departure day',
    title: 'Travel to Harbor City',
    summary: 'Departure journey',
    date: 'Fri, 10 May',
    dateTime: '2030-05-10',
    timeZoneLabel: 'Europe/Brussels',
    state: 'PAST',
    stateLabel: 'Completed',
    isOpenByDefault: false,
    leadEvent: {
      id: 'review-flight',
      kindLabel: 'Flight',
      title: 'Flight to Harbor City',
      time: '09:00',
      startsAt: '2030-05-10T09:00:00+02:00',
      transport: 'Example Air',
      relatedDocumentCount: 1,
    },
    additionalEventCount: 0,
    events: [
      {
        id: 'review-flight',
        kindLabel: 'Flight',
        title: 'Flight to Harbor City',
        time: '09:00',
        startsAt: '2030-05-10T09:00:00+02:00',
        transport: 'Example Air',
        relatedDocumentCount: 1,
      },
    ],
    relatedDocumentCount: 1,
  },
  {
    id: 'review-day-port',
    dayNumber: 2,
    kind: 'PORT_DAY',
    kindLabel: 'Port day',
    title: 'Harbor City',
    summary: 'Example Country',
    date: 'Sat, 11 May',
    dateTime: '2030-05-11',
    timeZoneLabel: 'Europe/Brussels',
    state: 'TODAY',
    stateLabel: 'Today',
    isOpenByDefault: true,
    leadEvent: {
      id: 'review-walk',
      kindLabel: 'Excursion',
      title: 'Coastal walk',
      time: '09:30',
      startsAt: '2030-05-11T09:30:00+02:00',
      location: 'Harbor Terminal',
      relatedDocumentCount: 0,
    },
    additionalEventCount: 1,
    events: [
      {
        id: 'review-walk',
        kindLabel: 'Excursion',
        title: 'Coastal walk',
        time: '09:30',
        startsAt: '2030-05-11T09:30:00+02:00',
        location: 'Harbor Terminal',
        relatedDocumentCount: 0,
      },
      {
        id: 'review-lunch',
        kindLabel: 'Meal',
        title: 'Lunch near the harbor',
        time: '12:30',
        startsAt: '2030-05-11T12:30:00+02:00',
        relatedDocumentCount: 0,
      },
    ],
    port: {
      location: 'Harbor Terminal',
      arrivalTime: '07:00',
      arrivalAt: '2030-05-11T07:00:00+02:00',
      departureTime: '18:00',
      departureAt: '2030-05-11T18:00:00+02:00',
    },
    summaryAllAboardTime: '17:30',
    summaryAllAboardAt: '2030-05-11T17:30:00+02:00',
    relatedDocumentCount: 0,
  },
  {
    id: 'review-day-sea',
    dayNumber: 3,
    kind: 'SEA_DAY',
    kindLabel: 'Sea day',
    title: 'At sea',
    summary: 'A quiet day aboard MV Example',
    date: 'Sun, 12 May',
    dateTime: '2030-05-12',
    timeZoneLabel: 'Europe/Brussels',
    state: 'UPCOMING',
    stateLabel: 'Upcoming',
    isOpenByDefault: false,
    additionalEventCount: 0,
    events: [],
    relatedDocumentCount: 0,
    emptyMessage: 'No activities are currently confirmed for this sea day.',
  },
]

function fixture(
  days: TripDayViewModel[],
  progress: TripProgressViewModel = activeProgress,
): TripViewModel {
  return {
    header: {
      title: 'Northern Coast Journey',
      dateRange: '10 May – 12 May 2030',
      cruiseContext: 'Aboard MV Example',
    },
    progress,
    days,
  }
}

export const tripReviewFixtures: Record<
  TripReviewState,
  TripViewModel
> = {
  'pre-trip': fixture(
    baseDays.map((day) => ({
      ...day,
      state: 'UPCOMING',
      stateLabel: 'Upcoming',
      isOpenByDefault: false,
    })),
    {
      state: 'PRE_TRIP',
      label: 'Before the trip',
      detail: '3 days planned',
      completedDays: 0,
      totalDays: 3,
      percentage: 0,
    },
  ),
  active: fixture(baseDays),
  'port-day': fixture(baseDays),
  'sea-day': fixture(
    baseDays.map((day, index) => ({
      ...day,
      state: index < 2 ? 'PAST' : 'TODAY',
      stateLabel: index < 2 ? 'Completed' : 'Today',
      isOpenByDefault: index === 2,
    })),
    {
      state: 'ACTIVE',
      label: 'Day 3 of 3',
      detail: '2 days completed',
      completedDays: 2,
      totalDays: 3,
      percentage: 67,
    },
  ),
  minimal: fixture([
    {
      ...baseDays[2],
      dayNumber: 1,
      state: 'TODAY',
      stateLabel: 'Today',
      isOpenByDefault: true,
    },
  ], {
    state: 'ACTIVE',
    label: 'Day 1 of 1',
    detail: '0 days completed',
    completedDays: 0,
    totalDays: 1,
    percentage: 0,
  }),
  completed: fixture(
    baseDays.map((day) => ({
      ...day,
      state: 'PAST',
      stateLabel: 'Completed',
      isOpenByDefault: false,
      summaryAllAboardTime: undefined,
      summaryAllAboardAt: undefined,
    })),
    {
      state: 'COMPLETED',
      label: 'Trip complete',
      detail: '3 days completed',
      completedDays: 3,
      totalDays: 3,
      percentage: 100,
    },
  ),
  'cross-zone': fixture([
    {
      ...baseDays[0],
      dayNumber: 1,
      date: 'Fri, 10 May',
      timeZoneLabel: 'Pacific/Auckland',
      state: 'TODAY',
      stateLabel: 'Today',
      isOpenByDefault: true,
      leadEvent: {
        ...baseDays[0].events[0],
        time: '08:15',
        startsAt: '2030-05-10T08:15:00+12:00',
      },
      events: [
        {
          ...baseDays[0].events[0],
          time: '08:15',
          startsAt: '2030-05-10T08:15:00+12:00',
        },
      ],
    },
  ], {
    state: 'ACTIVE',
    label: 'Day 1 of 1',
    detail: '0 days completed',
    completedDays: 0,
    totalDays: 1,
    percentage: 0,
  }),
  'missing-data': fixture([
    {
      ...baseDays[1],
      events: [],
      leadEvent: undefined,
      additionalEventCount: 0,
      port: { location: 'Open Harbor' },
      summaryAllAboardTime: undefined,
      summaryAllAboardAt: undefined,
      emptyMessage: 'No timed plans are configured for this day.',
    },
  ], {
    state: 'ACTIVE',
    label: 'Day 1 of 1',
    detail: '0 days completed',
    completedDays: 0,
    totalDays: 1,
    percentage: 0,
  }),
}
