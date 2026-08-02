import type { EventPreparationInfo } from '../../domain/trip/tripTypes.js'

/**
 * Preparation guidance for events on this trip, keyed by event ID.
 *
 * Summarized from two verified Oceania documents (never parsed at
 * runtime — this is a one-time, human-curated extraction):
 *  - "Shore Excursions" guide (`ShoreExcursions.pdf`): official helpful
 *    hints, clothing/footwear, accessibility, and boat/tender warnings
 *    for each Oceania-booked excursion, identified by its public code.
 *  - "Final Cruise Vacation Summary" / boarding pass: embarkation and
 *    terminal check-in instructions.
 *
 * Externally booked excursions (Gentle Giants, Arctic Shorex, Hebridean
 * Isle Tours) are not covered by those Oceania documents. Their entries
 * below are curated only from details already present on the
 * corresponding trip event (organizer, checkInAt, operationalNotes) —
 * nothing about their timing or booking is invented or altered here.
 */
export const oceaniaMarinaEventPreparation: Record<
  string,
  EventPreparationInfo
> = {
  'event-isafjordur-whale-nature': {
    eventId: 'event-isafjordur-whale-nature',
    source: 'SHORE_EXCURSIONS_GUIDE',
    sourceNote: 'Shore Excursions guide — Ísafjörður, ISF-013',
    boatInvolvement: 'BOAT_CRUISE',
    items: [
      {
        id: 'isafjordur-whale-clothing',
        category: 'CLOTHING',
        level: 'RECOMMENDED',
        text: 'Dress in weather-appropriate, layered clothing.',
      },
      {
        id: 'isafjordur-whale-footwear',
        category: 'FOOTWEAR',
        level: 'RECOMMENDED',
        text: 'Flat, comfortable walking shoes.',
      },
      {
        id: 'isafjordur-whale-accessibility',
        category: 'ACCESSIBILITY',
        level: 'HELPFUL',
        text: 'Includes about 5 steps; not recommended for wheelchair users.',
      },
    ],
  },
  'event-husavik-geosea-baths': {
    eventId: 'event-husavik-geosea-baths',
    source: 'SHORE_EXCURSIONS_GUIDE',
    sourceNote: 'Shore Excursions guide — Húsavík, HVK-006',
    items: [
      {
        id: 'husavik-geosea-clothing',
        category: 'CLOTHING',
        level: 'RECOMMENDED',
        text: 'Weather-appropriate clothing for the walk into town.',
      },
      {
        id: 'husavik-geosea-bring',
        category: 'WHAT_TO_BRING',
        level: 'REQUIRED',
        text: 'Swimsuit and towel — needed to use the GeoSea Baths.',
      },
      {
        id: 'husavik-geosea-footwear',
        category: 'FOOTWEAR',
        level: 'RECOMMENDED',
        text: 'Flat, comfortable walking shoes.',
      },
      {
        id: 'husavik-geosea-accessibility',
        category: 'ACCESSIBILITY',
        level: 'HELPFUL',
        text: 'Bath surfaces can be uneven and slippery, with no handrails. Consult a doctor first if you have high blood pressure or a heart condition.',
      },
    ],
  },
  'event-torshavn-vestmanna': {
    eventId: 'event-torshavn-vestmanna',
    source: 'SHORE_EXCURSIONS_GUIDE',
    sourceNote: 'Shore Excursions guide — Tórshavn, TAN-003',
    boatInvolvement: 'SEA_CLIFF_CRUISE',
    items: [
      {
        id: 'torshavn-vestmanna-weather',
        category: 'WEATHER_PROTECTION',
        level: 'REQUIRED',
        text: 'Waterproof jacket, and a waterproof bag for cameras/phones if you have one — sea spray is likely.',
      },
      {
        id: 'torshavn-vestmanna-footwear',
        category: 'FOOTWEAR',
        level: 'RECOMMENDED',
        text: 'Flat, non-slip shoes.',
      },
      {
        id: 'torshavn-vestmanna-clothing',
        category: 'CLOTHING',
        level: 'RECOMMENDED',
        text: 'Dress warmly — it is cooler on the water than ashore.',
      },
      {
        id: 'torshavn-vestmanna-boat',
        category: 'BOAT_OR_TRANSFER',
        level: 'HELPFUL',
        text: 'This excursion is a boat cruise along the sea cliffs.',
      },
    ],
  },
  'event-greenock-loch-lomond': {
    eventId: 'event-greenock-loch-lomond',
    source: 'SHORE_EXCURSIONS_GUIDE',
    sourceNote: 'Shore Excursions guide — Glasgow (Greenock), GRE-007',
    items: [
      {
        id: 'greenock-clothing',
        category: 'CLOTHING',
        level: 'RECOMMENDED',
        text: 'Layered clothing; a light raincoat or umbrella.',
      },
      {
        id: 'greenock-footwear',
        category: 'FOOTWEAR',
        level: 'RECOMMENDED',
        text: 'Flat, comfortable shoes — no heels inside the distillery.',
      },
      {
        id: 'greenock-accessibility',
        category: 'ACCESSIBILITY',
        level: 'HELPFUL',
        text: 'Several steep, narrow steps inside the distillery; not wheelchair accessible there.',
      },
      {
        id: 'greenock-bring',
        category: 'WHAT_TO_BRING',
        level: 'RECOMMENDED',
        text: 'Photo ID — the whisky tasting requires guests to be 21 or older.',
      },
    ],
  },
  'event-dublin-river-cruise': {
    eventId: 'event-dublin-river-cruise',
    source: 'SHORE_EXCURSIONS_GUIDE',
    sourceNote: 'Shore Excursions guide — Dublin (Dún Laoghaire), DLG-003',
    boatInvolvement: 'BOAT_CRUISE',
    items: [
      {
        id: 'dublin-clothing',
        category: 'CLOTHING',
        level: 'RECOMMENDED',
        text: 'Weather-appropriate clothing; a light raincoat or umbrella.',
      },
      {
        id: 'dublin-footwear',
        category: 'FOOTWEAR',
        level: 'RECOMMENDED',
        text: 'Flat, comfortable walking shoes.',
      },
      {
        id: 'dublin-accessibility',
        category: 'ACCESSIBILITY',
        level: 'HELPFUL',
        text: 'The river-cruise vessel has no wheelchair space.',
      },
      {
        id: 'dublin-boat',
        category: 'BOAT_OR_TRANSFER',
        level: 'HELPFUL',
        text: 'Part of this excursion is a river cruise on the Liffey Voyager.',
      },
    ],
  },
  'event-holyhead-penrhyn-castle': {
    eventId: 'event-holyhead-penrhyn-castle',
    source: 'SHORE_EXCURSIONS_GUIDE',
    sourceNote: 'Shore Excursions guide — Holyhead, HOY-003',
    items: [
      {
        id: 'holyhead-clothing',
        category: 'CLOTHING',
        level: 'RECOMMENDED',
        text: 'Weather-appropriate clothing; a light raincoat or umbrella.',
      },
      {
        id: 'holyhead-footwear',
        category: 'FOOTWEAR',
        level: 'RECOMMENDED',
        text: 'Flat, comfortable shoes — no heels inside the house.',
      },
      {
        id: 'holyhead-bring',
        category: 'WHAT_TO_BRING',
        level: 'HELPFUL',
        text: 'Hat, sunglasses and sunscreen if it is sunny.',
      },
      {
        id: 'holyhead-accessibility',
        category: 'ACCESSIBILITY',
        level: 'HELPFUL',
        text: 'About 2 hours of walking with two flights of stairs; not all have handrails.',
      },
    ],
  },
  'event-cork-jameson': {
    eventId: 'event-cork-jameson',
    source: 'SHORE_EXCURSIONS_GUIDE',
    sourceNote: 'Shore Excursions guide — Cork (Ringaskiddy), RIN-003',
    items: [
      {
        id: 'cork-clothing',
        category: 'CLOTHING',
        level: 'RECOMMENDED',
        text: 'Warm, waterproof clothing.',
      },
      {
        id: 'cork-footwear',
        category: 'FOOTWEAR',
        level: 'RECOMMENDED',
        text: 'Comfortable walking shoes — some cobblestone surfaces.',
      },
      {
        id: 'cork-accessibility',
        category: 'ACCESSIBILITY',
        level: 'HELPFUL',
        text: 'About 40 steps at the distillery and up to an hour of standing/walking. Wheelchair guests need a collapsible chair and a companion.',
      },
      {
        id: 'cork-food',
        category: 'FOOD_AND_DRINK',
        level: 'HELPFUL',
        text: 'A whiskey tasting is included; participants should be 18 or older.',
      },
    ],
  },
  'event-falmouth-st-ives': {
    eventId: 'event-falmouth-st-ives',
    source: 'SHORE_EXCURSIONS_GUIDE',
    sourceNote: 'Shore Excursions guide — Falmouth, FLH-002',
    items: [
      {
        id: 'falmouth-clothing',
        category: 'CLOTHING',
        level: 'RECOMMENDED',
        text: 'Weather-appropriate clothing; a light raincoat or umbrella.',
      },
      {
        id: 'falmouth-footwear',
        category: 'FOOTWEAR',
        level: 'RECOMMENDED',
        text: 'Flat, comfortable walking shoes.',
      },
      {
        id: 'falmouth-bring',
        category: 'WHAT_TO_BRING',
        level: 'HELPFUL',
        text: 'Hat, sunglasses, sunscreen, and a little cash — museum admissions are not included.',
      },
      {
        id: 'falmouth-accessibility',
        category: 'ACCESSIBILITY',
        level: 'HELPFUL',
        text: 'Moderate walking over varied surfaces; not recommended for wheelchair guests.',
      },
    ],
  },
  'event-husavik-big-whale-safari': {
    eventId: 'event-husavik-big-whale-safari',
    source: 'EXTERNAL_CONFIRMATION',
    sourceNote: 'Gentle Giants booking — existing confirmed check-in details',
    boatInvolvement: 'BOAT_CRUISE',
    items: [
      {
        id: 'husavik-safari-clothing',
        category: 'CLOTHING',
        level: 'RECOMMENDED',
        text: "Dress warmly in layers — you'll be out on the water.",
      },
      {
        id: 'husavik-safari-bring',
        category: 'WHAT_TO_BRING',
        level: 'REQUIRED',
        text: 'Ticket confirmation and photo ID for check-in.',
      },
    ],
  },
  'event-djupivogur-glacier-lagoon': {
    eventId: 'event-djupivogur-glacier-lagoon',
    source: 'EXTERNAL_CONFIRMATION',
    sourceNote: 'Arctic Shorex booking — existing operational note',
    items: [
      {
        id: 'djupivogur-tender-coordination',
        category: 'TIMING',
        level: 'REQUIRED',
        text: 'Early tender coordination is required — confirm your tender time with Guest Services the evening before.',
      },
    ],
  },
  'event-stornoway-isle-of-lewis': {
    eventId: 'event-stornoway-isle-of-lewis',
    source: 'EXTERNAL_CONFIRMATION',
    sourceNote: 'Hebridean Isle Tours booking — existing operational note',
    items: [
      {
        id: 'stornoway-timing-tbc',
        category: 'TIMING',
        level: 'RECOMMENDED',
        text: 'The 08:30 departure is a working assumption — confirm it is still accurate.',
      },
      {
        id: 'stornoway-bring',
        category: 'WHAT_TO_BRING',
        level: 'REQUIRED',
        text: 'Your excursion confirmation.',
      },
    ],
  },
  'event-embarkation': {
    eventId: 'event-embarkation',
    source: 'OCEANIA_SUMMARY',
    sourceNote: 'Oceania boarding pass — boarding checklist',
    finalCruiseSummaryDocumentIds: ['boarding-pass'],
    items: [
      {
        id: 'embarkation-documents',
        category: 'DOCUMENTS',
        level: 'REQUIRED',
        text: 'Boarding pass, passport, and any required visa or health documentation.',
      },
      {
        id: 'embarkation-luggage-tags',
        category: 'WHAT_TO_BRING',
        level: 'RECOMMENDED',
        text: 'Affix your luggage tags before arriving at the terminal.',
      },
    ],
  },
  'event-reykjavik-terminal-checkin': {
    eventId: 'event-reykjavik-terminal-checkin',
    source: 'OCEANIA_SUMMARY',
    sourceNote:
      'Oceania boarding pass — Terminal Arrival Information, Skarfabakki 315',
    finalCruiseSummaryDocumentIds: ['boarding-pass'],
    items: [
      {
        id: 'reykjavik-checkin-timing',
        category: 'TIMING',
        level: 'REQUIRED',
        text: 'Terminal arrival window is 12:00–12:30. Embarkation itself begins at 13:00.',
      },
      {
        id: 'reykjavik-checkin-documents',
        category: 'DOCUMENTS',
        level: 'REQUIRED',
        text: 'Boarding pass, passport, and any required visas.',
      },
    ],
  },
  'event-disembarkation': {
    eventId: 'event-disembarkation',
    source: 'CURATED',
    sourceNote: 'Cruise vacation summary — disembarkation notes',
    items: [
      {
        id: 'disembarkation-cabin',
        category: 'BEFORE_YOU_LEAVE',
        level: 'RECOMMENDED',
        text: 'Vacate your cabin and have your carry bag ready before your disembarkation group is called.',
      },
    ],
  },
}
