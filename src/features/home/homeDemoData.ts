import {
  CRUISE_DAY_TYPES,
  HOME_PHASES,
  type HomeViewModel,
} from './homeTypes'

export type DemoHomeState =
  | 'departure-day'
  | 'final-travel-day'
  | 'port-day'
  | 'pre-trip'
  | 'sea-day'

export const DEFAULT_DEMO_HOME_STATE: DemoHomeState = 'pre-trip'

export const homeDemoData: Record<DemoHomeState, HomeViewModel> = {
  'pre-trip': {
    phase: HOME_PHASES.PRE_TRIP,
    context: {
      eyebrow: 'Before your trip',
      title: 'Iceland & British Isles',
      summary: 'Oceania Marina',
      tripDates: '22 August – 4 September 2026',
      countdown: '27 days to departure',
    },
    milestone: {
      label: 'Next milestone',
      title: 'Leave for Brussels Airport',
      time: '13:00',
      detail: 'Planned departure from home',
      countdown: 'Departure day · 22 August',
    },
    weather: {
      location: 'Reykjavík',
      temperature: '12°C',
      condition: 'Cloudy',
      wind: '18 km/h',
      rain: 'Light rain possible',
    },
    checklistTitle: 'Before departure',
    checklist: [
      { label: 'Passports', complete: true },
      { label: 'Flight documents' },
      { label: 'Medication', complete: true },
      { label: 'Chargers', complete: true },
      { label: 'Luggage check' },
    ],
    alert: {
      title: 'Travel documents still need checking',
      detail: 'Review the flight documents before departure day.',
    },
  },
  'departure-day': {
    phase: HOME_PHASES.DEPARTURE_DAY,
    context: {
      eyebrow: 'Departure day',
      title: 'Travel to Reykjavík',
      summary: 'From home to your Reykjavík hotel',
      tripDates: 'Saturday · 22 August 2026',
    },
    milestone: {
      label: 'Next milestone',
      title: 'Leave home',
      time: '13:00',
      detail: 'Allow 90 minutes for traffic and check-in',
      countdown: 'Flight at 17:45',
    },
    weather: {
      location: 'Reykjavík',
      temperature: '11°C',
      condition: 'Mostly cloudy',
      wind: '16 km/h',
      rain: 'Brief showers',
    },
    checklistTitle: 'Before leaving',
    checklist: [
      { label: 'Passports', complete: true },
      { label: 'Wallet', complete: true },
      { label: 'Medication', complete: true },
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
      title: 'Belfast',
      summary: 'Northern Ireland',
    },
    cruiseProgress: {
      day: 7,
      totalDays: 13,
      daysRemaining: 6,
    },
    milestone: {
      label: 'Next milestone',
      title: 'Giant’s Causeway excursion',
      time: '08:15',
      location: 'Marina Lounge',
      detail: 'Meet before going ashore',
      allAboardTime: '17:30',
      tone: 'urgent',
    },
    weather: {
      location: 'Belfast',
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
      detail: 'Meet in the Marina Lounge at 08:15.',
    },
  },
  'sea-day': {
    phase: HOME_PHASES.CRUISE,
    cruiseDayType: CRUISE_DAY_TYPES.SEA_DAY,
    context: {
      eyebrow: 'Sea day',
      title: 'At sea',
      summary: 'A relaxed day aboard Oceania Marina',
    },
    cruiseProgress: {
      day: 5,
      totalDays: 13,
      daysRemaining: 8,
    },
    milestone: {
      label: 'Next milestone',
      title: 'Wine tasting',
      time: '14:30',
      location: 'La Reserve',
      detail: 'Arrive a few minutes early',
      countdown: 'This afternoon',
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
      { label: 'Evening dress code' },
    ],
  },
  'final-travel-day': {
    phase: HOME_PHASES.FINAL_TRAVEL_DAY,
    context: {
      eyebrow: 'Final travel day',
      title: 'Southampton → Home',
      summary: 'Disembarkation and journey home',
      tripDates: 'Friday · 4 September 2026',
    },
    milestone: {
      label: 'Next milestone',
      title: 'Disembark and meet transfer',
      time: '08:30',
      location: 'Herbert Walker Avenue, Southampton',
      detail: 'Transfer continues to Heathrow',
      tone: 'urgent',
    },
    weather: {
      location: 'Southampton',
      temperature: '15°C',
      condition: 'Partly cloudy',
      wind: '12 km/h',
    },
    checklistTitle: 'Before disembarking',
    checklist: [
      { label: 'Passports', complete: true },
      { label: 'Flight documents', complete: true },
      { label: 'Medication', complete: true },
      { label: 'Phone chargers' },
      { label: 'Cabin checked' },
    ],
    alert: {
      title: 'Transfer arrives in 20 minutes',
      detail: 'Be ready to leave the terminal with all hand luggage.',
    },
  },
}
