import type { IconName } from '../../components/AppIcon'

export interface PlaceholderScreen {
  path: string
  title: string
  description: string
  icon: IconName
}

export const placeholderScreens: PlaceholderScreen[] = [
  {
    path: 'today',
    title: 'Today',
    description: 'Your calm view of what matters right now will live here.',
    icon: 'calendar',
  },
  {
    path: 'trip',
    title: 'Trip',
    description: 'The shape of your journey will become clear here.',
    icon: 'map',
  },
  {
    path: 'discover',
    title: 'Discover',
    description: 'Thoughtful ideas for meaningful moments will appear here.',
    icon: 'compass',
  },
  {
    path: 'documents',
    title: 'Documents',
    description: 'Important travel references will be easy to find here.',
    icon: 'document',
  },
  {
    path: 'more',
    title: 'More',
    description: 'Supporting information and preferences will live here.',
    icon: 'more',
  },
]
