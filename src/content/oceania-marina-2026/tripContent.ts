import type { TripContentBundle } from '../../domain/content/contentTypes'

export const oceaniaMarina2026TripContent: TripContentBundle = {
  schemaVersion: 1,
  contentVersion: '2026-07-27.1',
  tripId: 'trip-oceania-marina-2026',
  destinationGuides: [],
  excursionGuides: [
    {
      id: 'excursion-guide-husavik-big-whale-safari',
      eventId: 'event-husavik-big-whale-safari',
      summary:
        'Travel across Skjálfandi Bay aboard a fast RIB boat that can cover a wide search area in pursuit of larger whales. The low, agile vessel adds excitement and allows the crew to explore farther into the bay when conditions permit. All encounters involve wild animals, so whale sightings and behaviour can never be guaranteed.',
      highlights: [
        'Fast RIB journey across Skjálfandi Bay',
        'Wider search range for larger whales',
        'Low viewpoint close to the water',
        'Wildlife-focused experience with no guaranteed sightings',
      ],
      lookOutFor: [
        'Blows appearing above the surface',
        'Humpback backs and tail flukes',
        'Groups of dolphins or porpoises',
        'Seabirds gathering over feeding activity',
      ],
      preparation: [
        'Dress warmly in layers',
        'Wear closed, non-slip footwear',
        'Protect phones and cameras from spray',
        'Consider motion-sickness precautions when appropriate',
      ],
      seasonalNote:
        'The operator normally includes Puffin Island during the nesting period, approximately 15 April to 15 August. This excursion takes place on 25 August, so a Puffin Island visit and puffin sightings must not be assumed unless Gentle Giants confirms them closer to departure.',
      sourceReferences: [
        {
          id: 'source-gentle-giants-gg2',
          name: 'Gentle Giants Whale Watching',
          type: 'EXCURSION_OPERATOR',
          url: 'https://www.gentlegiants.is/tours-and-bookings/gg2-big-whale-safari-and-puffins/',
          reviewedAt: '2026-07-27',
        },
        {
          id: 'source-gentle-giants-puffins',
          name: 'Gentle Giants Whale Watching',
          type: 'EXCURSION_OPERATOR',
          url: 'https://www.gentlegiants.is/wildlife/puffins/',
          reviewedAt: '2026-07-27',
        },
      ],
      reviewedAt: '2026-07-27',
      verification: 'PRIMARY_SOURCE_REVIEWED',
    },
    {
      id: 'excursion-guide-djupivogur-glacier-lagoon',
      eventId: 'event-djupivogur-glacier-lagoon',
      summary:
        'Travel from Djúpivogur through the dramatic landscapes of southeast Iceland to Jökulsárlón Glacier Lagoon, where icebergs drift through a glacial lake toward the sea. The route also includes the black shoreline of Diamond Beach and scenic mountain stops around Vestrahorn and Eystrahorn, creating a full day focused on glaciers, volcanic coastlines and photography.',
      context:
        'The operator lists an approximate seven-hour outing with bus transport and parking fees included. Food and drinks are not included.',
      highlights: [
        'Floating icebergs at Jökulsárlón Glacier Lagoon',
        'Ice fragments contrasting with the black sand of Diamond Beach',
        'Coastal scenery around Vestrahorn and Stokksnes',
        'Rugged views of Eystrahorn',
        'Scenic drive through southeast Iceland',
      ],
      lookOutFor: [
        'Different shapes and colours in the glacial ice',
        'Ice moving from the lagoon toward the sea',
        'Reflections in the tidal flats around Vestrahorn',
        'Rapidly changing weather and light',
        'Black volcanic sand contrasting with ice and mountains',
      ],
      funFacts: [
        'Icebergs in the lagoon have broken away from the glacier through a process called calving.',
        'The ice may appear blue where dense glacial ice absorbs more red light.',
        'Diamond Beach gets its name from pieces of ice that resemble gems against the black sand.',
        'The coastline combines glacial, volcanic and marine landscapes within a relatively small area.',
      ],
      preparation: [
        'Wear sturdy, closed shoes',
        'Bring windproof and waterproof outer layers',
        'Carry a small backpack with water and food',
        'Protect cameras and phones from rain, spray and sand',
      ],
      sourceReferences: [
        {
          id: 'source-arctic-shorex-djupivogur',
          name: 'Arctic Shorex',
          type: 'EXCURSION_OPERATOR',
          url: 'https://arcticshorex.com/tours/djupivogur-group-jokulsarlon-glacier-lagoon/',
          reviewedAt: '2026-07-27',
        },
      ],
      reviewedAt: '2026-07-27',
      verification: 'PRIMARY_SOURCE_REVIEWED',
    },
  ],
}
