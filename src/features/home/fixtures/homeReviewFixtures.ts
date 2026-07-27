import {
  CRUISE_DAY_TYPES,
  HOME_PHASES,
  type HomeViewModel,
} from '../homeTypes'

export type ReviewHomeState =
  | 'departure-day'
  | 'final-travel-day'
  | 'port-day'
  | 'pre-trip'
  | 'sea-day'

export const DEFAULT_REVIEW_HOME_STATE: ReviewHomeState = 'pre-trip'

export const homeReviewFixtures: Record<ReviewHomeState, HomeViewModel> = {
  'pre-trip': {
    phase: HOME_PHASES.PRE_TRIP,
    context: {
      eyebrow: 'Before your trip',
      title: 'Our journey begins soon',
      summary:
        'Two weeks to explore, enjoy, and create beautiful memories together.',
      tripDates: '10–14 May 2030',
      countdown: '27 days to departure',
    },
    milestone: {
      label: 'Next milestone',
      title: 'Leave for Harbor City Airport',
      time: '13:00',
      detail: 'Planned departure from home area',
      countdown: 'Departure day · 10 May',
    },
    weather: {
      location: 'Harbor City',
      temperature: '12°C',
      condition: 'Cloudy',
      wind: '18 km/h',
      rain: 'Light rain possible',
    },
    checklistTitle: 'Before departure',
    checklist: [
      { label: 'Travel documents', complete: true },
      { label: 'Medication', complete: true },
      { label: 'Chargers', complete: true },
      { label: 'Luggage check' },
    ],
    alert: {
      title: 'Travel documents still need checking',
      detail: 'Review the fixture documents before departure day.',
    },
  },
  'departure-day': {
    phase: HOME_PHASES.DEPARTURE_DAY,
    context: {
      eyebrow: 'Departure day',
      title: 'Travel to Harbor City',
      summary: 'Departure journey',
      tripDates: 'Friday · 10 May 2030',
    },
    milestone: {
      label: 'Next milestone',
      title: 'Leave home area',
      time: '13:00',
      detail: 'Allow time for traffic and check-in',
      countdown: 'Flight at 17:45',
    },
    weather: {
      location: 'Harbor City',
      temperature: '11°C',
      condition: 'Mostly cloudy',
      wind: '16 km/h',
      rain: 'Brief showers',
    },
    checklistTitle: 'Before leaving',
    checklist: [
      { label: 'Travel documents', complete: true },
      { label: 'Wallet', complete: true },
      { label: 'Phones and chargers' },
      { label: 'Luggage', complete: true },
    ],
    alert: {
      title: 'Check phones and chargers',
      detail: 'Place both chargers in the hand luggage before leaving.',
    },
  },
  'port-day': {
    phase: HOME_PHASES.CRUISE,
    cruiseDayType: CRUISE_DAY_TYPES.PORT_DAY,
    context: {
      eyebrow: 'Port day',
      title: 'Harbor City',
      summary: 'Example Country',
    },
    cruiseProgress: {
      day: 2,
      totalDays: 4,
      daysRemaining: 2,
    },
    milestone: {
      label: 'Next milestone',
      title: 'Coastal walk',
      time: '09:30',
      location: 'Harbor Terminal',
      detail: 'Meet before going ashore',
      allAboardTime: '17:30',
      tone: 'urgent',
    },
    weather: {
      location: 'Harbor City',
      temperature: '14°C',
      condition: 'Light rain',
      wind: 'Windy',
      rain: 'Rain jacket recommended',
    },
    checklistTitle: 'Take ashore',
    checklist: [
      { label: 'Excursion ticket', complete: true },
      { label: 'Rain jacket' },
      { label: 'Medication', complete: true },
      { label: 'Power bank', complete: true },
    ],
    alert: {
      title: 'Leave the ship in 20 minutes',
      detail: 'Meet at Harbor Terminal at 09:30.',
    },
  },
  'sea-day': {
    phase: HOME_PHASES.CRUISE,
    cruiseDayType: CRUISE_DAY_TYPES.SEA_DAY,
    context: {
      eyebrow: 'Sea day',
      title: 'At sea',
      summary: 'A relaxed day aboard MV Example',
    },
    cruiseProgress: {
      day: 3,
      totalDays: 4,
      daysRemaining: 1,
    },
    milestone: {
      label: 'Next milestone',
      title: 'Dinner reservation',
      time: '19:00',
      detail: 'Arrive a few minutes early',
      countdown: 'This evening',
    },
    weather: {
      location: 'At sea',
      temperature: '11°C',
      condition: 'Strong wind',
      wind: '35 km/h',
      seaCondition: 'Moderate swell',
    },
    checklistTitle: 'Today’s essentials',
    checklist: [
      { label: 'Dinner reservation', complete: true },
      { label: 'Medication', complete: true },
      { label: 'Pool bag' },
    ],
  },
  'final-travel-day': {
    phase: HOME_PHASES.FINAL_TRAVEL_DAY,
    context: {
      eyebrow: 'Final travel day',
      title: 'Harbor City → Home',
      summary: 'Disembarkation and journey home',
      tripDates: 'Tuesday · 14 May 2030',
    },
    milestone: {
      label: 'Next milestone',
      title: 'Disembark and meet transfer',
      time: '08:30',
      location: 'Harbor Terminal',
      detail: 'Transfer continues to the airport',
      tone: 'urgent',
    },
    weather: {
      location: 'Harbor City',
      temperature: '15°C',
      condition: 'Partly cloudy',
      wind: '12 km/h',
    },
    checklistTitle: 'Before disembarking',
    checklist: [
      { label: 'Travel documents', complete: true },
      { label: 'Medication', complete: true },
      { label: 'Phone chargers' },
      { label: 'Room checked' },
    ],
    alert: {
      title: 'Transfer arrives in 20 minutes',
      detail: 'Be ready to leave the terminal with all hand luggage.',
    },
  },
}
