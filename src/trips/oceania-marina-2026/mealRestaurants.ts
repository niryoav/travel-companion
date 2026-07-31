import type { MealRestaurant } from '../../domain/trip/tripTypes.js'

export const oceaniaMarinaMealRestaurants = [
  {
    id: 'grand-dining-room',
    name: 'The Grand Dining Room',
    location: 'Deck 6',
    reservationRequiredForDinner: false,
    extraFee: false,
    services: {
      BREAKFAST: [{ opensAt: '08:00', closesAt: '09:30' }],
      LUNCH: [{ opensAt: '12:00', closesAt: '13:30', dayType: 'SEA' }],
      DINNER: [{ opensAt: '18:30', closesAt: '21:30' }],
    },
  },
  {
    id: 'terrace-cafe',
    name: 'Terrace Café',
    location: 'Deck 12',
    reservationRequiredForDinner: false,
    extraFee: false,
    services: {
      BREAKFAST: [{ opensAt: '07:30', closesAt: '10:00' }],
      LUNCH: [{ opensAt: '12:00', closesAt: '14:00' }],
      DINNER: [{ opensAt: '18:30', closesAt: '21:00' }],
    },
  },
  {
    id: 'waves-grill',
    name: 'Waves Grill',
    location: 'Deck 12',
    reservationRequiredForDinner: false,
    extraFee: false,
    services: {
      BREAKFAST: [{ opensAt: '07:00', closesAt: '11:00' }],
      LUNCH: [{ opensAt: '11:30', closesAt: '16:00' }],
      DINNER: [
        {
          opensAt: '18:30',
          closesAt: '21:00',
          note: 'Pizzeria',
        },
      ],
    },
  },
  {
    id: 'aquamar-kitchen',
    name: 'Aquamar Kitchen',
    location: 'Deck 12',
    reservationRequiredForDinner: false,
    extraFee: false,
    services: {
      BREAKFAST: [
        { opensAt: '07:00', closesAt: '10:00', dayType: 'PORT' },
        { opensAt: '08:00', closesAt: '11:00', dayType: 'SEA' },
      ],
      LUNCH: [
        { opensAt: '11:00', closesAt: '15:00', dayType: 'PORT' },
        { opensAt: '12:00', closesAt: '16:00', dayType: 'SEA' },
      ],
    },
  },
  {
    id: 'polo-grill',
    name: 'Polo Grill',
    location: 'Deck 14',
    reservationRequiredForDinner: true,
    extraFee: false,
    services: {
      DINNER: [{ opensAt: '18:30', closesAt: '21:00' }],
    },
  },
  {
    id: 'toscana',
    name: 'Toscana',
    location: 'Deck 14',
    reservationRequiredForDinner: true,
    extraFee: false,
    services: {
      DINNER: [{ opensAt: '18:30', closesAt: '21:00' }],
    },
  },
  {
    id: 'jacques',
    name: 'Jacques',
    location: 'Deck 5',
    reservationRequiredForDinner: true,
    extraFee: false,
    services: {
      DINNER: [{ opensAt: '18:30', closesAt: '21:00' }],
    },
  },
  {
    id: 'red-ginger',
    name: 'Red Ginger',
    location: 'Deck 5',
    reservationRequiredForDinner: true,
    extraFee: false,
    services: {
      DINNER: [{ opensAt: '18:30', closesAt: '21:00' }],
    },
  },
  {
    id: 'privee',
    name: 'Privée',
    location: 'Deck 14',
    reservationRequiredForDinner: true,
    extraFee: true,
    services: {
      DINNER: [
        {
          opensAt: '18:30',
          closesAt: '21:00',
          note: 'Extra fee for exclusive private dining',
        },
      ],
    },
  },
] as const satisfies readonly MealRestaurant[]
