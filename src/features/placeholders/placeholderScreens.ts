import type { IconName } from '../../components/AppIcon'

export interface DestinationDefinition {
  description: string
  icon: IconName
  path: 'documents' | 'today' | 'trip'
  placeholder: string
  title: string
}

export const destinationDefinitions: DestinationDefinition[] = [
  {
    path: 'today',
    title: 'Today',
    icon: 'calendar',
    description: 'A dependable view of the current travel day.',
    placeholder:
      'Timing, plans, and useful current-day context will be introduced in a later sprint.',
  },
  {
    path: 'trip',
    title: 'Trip',
    icon: 'map',
    description: 'The shared shape of the journey, presented clearly.',
    placeholder:
      'Itinerary structure and trip details remain intentionally out of scope for this sprint.',
  },
  {
    path: 'documents',
    title: 'Documents',
    icon: 'document',
    description: 'A calm home for important travel references.',
    placeholder:
      'Document handling and private travel files will be designed in a future sprint.',
  },
]
