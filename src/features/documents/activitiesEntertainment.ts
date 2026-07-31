export interface ActivityEntertainmentEntry {
  location: string
  deck: number
  activity: string
}

export const activitiesEntertainment = [
  {
    location: 'Aquamar Spa & Vitality',
    deck: 14,
    activity:
      'Fitness classes such as yoga and Pilates, spa treatments and lectures',
  },
  {
    location: 'Artist Loft',
    deck: 12,
    activity: 'Creative workshops including painting, drawing and photography',
  },
  {
    location: 'Casino & Casino Bar',
    deck: 6,
    activity: 'Roulette, blackjack, poker and slot machines',
  },
  {
    location: 'Culinary Center',
    deck: 12,
    activity: 'Hands-on cooking classes led by master chefs',
  },
  {
    location: 'Fitness Track & Sport',
    deck: 15,
    activity: 'Running track, shuffleboard, croquet and pétanque',
  },
  {
    location: 'Horizons',
    deck: 15,
    activity:
      'Daily High Tea at 16:00; evening dance bands, karaoke and jazz',
  },
  {
    location: 'Library',
    deck: 14,
    activity: 'Relaxing and reading in a quiet library',
  },
  {
    location: 'Lounge',
    deck: 5,
    activity: 'Guest lectures, enrichment talks, trivia and social events',
  },
  {
    location: 'Marina Lounge',
    deck: 5,
    activity:
      'Main theatre with production shows, guest performers, comedians and concerts',
  },
  {
    location: 'Martinis',
    deck: 6,
    activity: 'Piano bar with live piano music, jazz and cocktails',
  },
  {
    location: 'Pool Deck',
    deck: 12,
    activity: 'Swimming, relaxing and live daytime music',
  },
  {
    location: 'Sports Deck',
    deck: 16,
    activity: 'Paddle tennis and golf putting greens',
  },
] as const satisfies readonly ActivityEntertainmentEntry[]
