import { describe, expect, it } from 'vitest'

import { oceaniaMarinaDinnerRestaurants } from './dinnerRestaurants'

describe('Oceania Marina dinner restaurant catalog', () => {
  it('contains exactly the nine approved restaurants and locations', () => {
    expect(oceaniaMarinaDinnerRestaurants).toEqual([
      {
        id: 'grand-dining-room',
        name: 'The Grand Dining Room',
        location: 'Deck 6',
        reservationRequired: false,
        extraFee: false,
      },
      {
        id: 'terrace-cafe',
        name: 'Terrace Café',
        location: 'Deck 12',
        reservationRequired: false,
        extraFee: false,
      },
      {
        id: 'waves-grill',
        name: 'Waves Grill',
        location: 'Deck 12',
        reservationRequired: false,
        extraFee: false,
      },
      {
        id: 'polo-grill',
        name: 'Polo Grill',
        location: 'Deck 14',
        reservationRequired: true,
        extraFee: false,
      },
      {
        id: 'toscana',
        name: 'Toscana',
        location: 'Deck 14',
        reservationRequired: true,
        extraFee: false,
      },
      {
        id: 'jacques',
        name: 'Jacques',
        location: 'Deck 5',
        reservationRequired: true,
        extraFee: false,
      },
      {
        id: 'red-ginger',
        name: 'Red Ginger',
        location: 'Deck 5',
        reservationRequired: true,
        extraFee: false,
      },
      {
        id: 'la-reserve',
        name: 'La Reserve',
        location: 'Deck 12',
        reservationRequired: true,
        extraFee: true,
      },
      {
        id: 'privee',
        name: 'Privée',
        location: 'Deck 14',
        reservationRequired: true,
        extraFee: true,
      },
    ])
  })
})
