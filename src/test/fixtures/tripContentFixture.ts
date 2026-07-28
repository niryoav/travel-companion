import type { TripContentBundle } from '../../domain/content/contentTypes'

export const tripContentFixture: TripContentBundle = {
  schemaVersion: 1,
  contentVersion: 'fixture-1',
  tripId: 'trip-northern-coast-fixture',
  destinationGuides: [
    {
      id: 'destination-guide-harbor-city',
      locationId: 'location-harbor-terminal',
      introduction:
        'Harbor City is a fictional coastal destination used to review concise offline travel content. Its waterfront connects a compact historic center with broad sea views, making it easy to understand the setting before leaving the ship without relying on live services or changing visitor information.',
      highlights: [
        'A compact historic waterfront',
        'Open views across the fictional northern coast',
        'A walkable center close to the harbor',
      ],
      practicalFacts: [
        { label: 'Language', value: 'Example language' },
        { label: 'Currency', value: 'Example crown' },
      ],
      goodToKnow: [
        'Coastal conditions can feel cooler than inland areas.',
      ],
      sourceReferences: [
        {
          id: 'source-example-tourism',
          name: 'Example Tourism Authority',
          type: 'TOURISM_AUTHORITY',
          url: 'https://example.com/harbor-city',
          reviewedAt: '2029-01-02',
        },
      ],
      reviewedAt: '2029-01-02',
      verification: 'PRIMARY_SOURCE_REVIEWED',
    },
  ],
  excursionGuides: [
    {
      id: 'excursion-guide-coastal-walk',
      eventId: 'event-excursion',
      summary:
        'This fictional guided walk introduces the harbor landscape and the older streets near the waterfront. It demonstrates how confirmed excursion background can enrich an operational event without repeating its meeting time, location, or other itinerary instructions.',
      highlights: [
        'Harbor landscape',
        'Historic streets',
        'Local coastal context',
      ],
      context:
        'The fictional route connects the day’s excursion to the wider destination.',
      sourceReferences: [
        {
          id: 'source-example-operator',
          name: 'Example Excursion Operator',
          type: 'EXCURSION_OPERATOR',
          url: 'https://example.com/coastal-walk',
          reviewedAt: '2029-01-02',
        },
      ],
      reviewedAt: '2029-01-02',
      verification: 'PRIMARY_SOURCE_REVIEWED',
    },
  ],
}
