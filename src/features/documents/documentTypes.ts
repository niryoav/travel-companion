import type { DocumentCategory } from '../../domain/trip/tripTypes.js'

export interface DocumentActionViewModel {
  id: string
  href: string
  label: string
  title: string
  operationalNotice?: string
}

export interface TravelDocumentViewModel extends DocumentActionViewModel {
  category: DocumentCategory
  categoryLabel: string
  date: string
  dateTime: string
  context?: string
  description: string
  offlineLabel: string
  verificationLabel: string
}

export interface DocumentGroupViewModel {
  id: 'HOTEL' | 'TRANSFER' | 'EXCURSION'
  title: string
  documents: TravelDocumentViewModel[]
}

export interface DocumentsViewModel {
  groups: DocumentGroupViewModel[]
}
