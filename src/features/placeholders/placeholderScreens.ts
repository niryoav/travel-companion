import type { IconName } from '../../components/AppIcon'

export interface DestinationDefinition {
  description: string
  icon: IconName
  path: 'documents'
  placeholder: string
  title: string
}

export const destinationDefinitions: DestinationDefinition[] = [
  {
    path: 'documents',
    title: 'Documents',
    icon: 'document',
    description: 'A calm home for important travel references.',
    placeholder:
      'Document handling and private travel files will be designed in a future sprint.',
  },
]
