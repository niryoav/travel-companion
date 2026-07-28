import type { DocumentReference } from '../../domain/trip/tripTypes'

export function createDocumentFixture(
  overrides: Partial<DocumentReference> = {},
): DocumentReference {
  return {
    id: 'document-example',
    title: 'Example travel document',
    category: 'FLIGHT',
    assetPath: '/documents/travel/example-travel-document.pdf',
    mimeType: 'application/pdf',
    associatedDate: '2030-05-10',
    dayId: 'day-2030-05-10',
    description: 'Privacy-safe fixture document.',
    actionLabel: 'Open document',
    offlineAvailable: true,
    verificationStatus: 'ISSUED',
    ...overrides,
  }
}
