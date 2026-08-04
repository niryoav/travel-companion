import type {
  DocumentCategory,
  DocumentReference,
  TripData,
} from '../../../domain/trip/tripTypes.js'
import type {
  DocumentActionViewModel,
  DocumentGroupViewModel,
  DocumentsViewModel,
  TravelDocumentViewModel,
} from '../documentTypes.js'

function formatDate(localDate: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${localDate}T12:00:00Z`))
}

function categoryLabel(category: DocumentCategory): string {
  switch (category) {
    case 'HOTEL':
      return 'Hotel'
    case 'TRANSFER':
      return 'Transfer'
    case 'EXCURSION':
    case 'EXCURSION_TICKET':
      return 'Excursion ticket'
    case 'EXCURSION_CONFIRMATION':
      return 'Excursion confirmation'
    case 'FLIGHT':
      return 'Flight'
    case 'CRUISE':
      return 'Cruise'
  }
}

export function selectDocumentAction(
  document: DocumentReference,
): DocumentActionViewModel {
  return {
    id: document.id,
    href: document.assetPath,
    label: document.actionLabel,
    title: document.title,
    operationalNotice: document.operationalNotice,
  }
}

function documentViewModel(
  data: TripData,
  document: DocumentReference,
): TravelDocumentViewModel {
  const location = data.locations.find(({ id }) => id === document.locationId)
  const event = data.events.find(({ documentReferenceIds = [] }) =>
    documentReferenceIds.includes(document.id),
  )

  return {
    ...selectDocumentAction(document),
    category: document.category,
    categoryLabel: categoryLabel(document.category),
    date: formatDate(document.associatedDate),
    dateTime: document.associatedDate,
    context: event?.title ?? location?.name,
    description: document.description,
    offlineLabel: document.offlineAvailable
      ? 'Available offline'
      : 'Online only',
    verificationLabel:
      document.verificationStatus === 'ISSUED'
        ? 'Issued confirmation'
        : 'Issued document · schedule note applies',
  }
}

const groupDefinitions: {
  id: DocumentGroupViewModel['id']
  title: string
  matches: (category: DocumentCategory) => boolean
}[] = [
  {
    id: 'HOTEL',
    title: 'Hotel',
    matches: (category) => category === 'HOTEL',
  },
  {
    id: 'TRANSFER',
    title: 'Transfers',
    matches: (category) => category === 'TRANSFER',
  },
  {
    id: 'EXCURSION',
    title: 'Independent excursions',
    matches: (category) =>
      category === 'EXCURSION' ||
      category === 'EXCURSION_TICKET' ||
      category === 'EXCURSION_CONFIRMATION',
  },
]

export function selectDocumentsViewModel(data: TripData): DocumentsViewModel {
  const documents = [...data.documentReferences]
    .sort((left, right) =>
      left.associatedDate.localeCompare(right.associatedDate),
    )
    .map((document) => documentViewModel(data, document))

  return {
    groups: groupDefinitions
      .map(({ id, title, matches }) => ({
        id,
        title,
        documents: documents.filter(({ category }) => matches(category)),
      }))
      .filter(({ documents: groupDocuments }) => groupDocuments.length > 0),
  }
}
