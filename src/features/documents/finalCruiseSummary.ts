import type { DocumentActionViewModel } from './documentTypes'

const FINAL_CRUISE_SUMMARY_FOLDER = 'Final Cruise Vacation Summary'

export interface FinalCruiseSummaryDocument {
  id: string
  title: string
  description: string
  href: string
}

interface FinalCruiseSummaryFile {
  id: string
  title: string
  description: string
  filename: string
}

const FINAL_CRUISE_SUMMARY_FILES: readonly FinalCruiseSummaryFile[] = [
  {
    id: 'boarding-pass',
    title: 'Boarding pass',
    description:
      'Terminal arrival time, pier address, and boarding checklist for both guests.',
    filename: '4103416_BoardingPass Yoav.pdf',
  },
  {
    id: 'guest-registration-form',
    title: 'Guest registration form',
    description:
      'Passport and emergency-contact details on file with Oceania for check-in.',
    filename: 'GIF1_NIR4103416 guest registration.pdf',
  },
  {
    id: 'cruise-vacation-summary-yoav',
    title: 'Cruise vacation summary — Yoav',
    description:
      'Booking, itinerary, pre-purchased excursions, and dinner reservations.',
    filename: 'Yoav summary.pdf',
  },
  {
    id: 'cruise-vacation-summary-isabel',
    title: 'Cruise vacation summary — Isabel',
    description:
      'Booking, itinerary, pre-purchased excursions, and dinner reservations.',
    filename: 'isabel summary.pdf',
  },
  {
    id: 'shore-excursions-guide',
    title: 'Shore excursions guide',
    description:
      'Full excursion catalogue for every port, with timing and activity details.',
    filename: 'ShoreExcursions.pdf',
  },
  {
    id: 'ticket-contract',
    title: 'Ticket contract & terms',
    description: 'Oceania Cruises terms and conditions of carriage.',
    filename: 'Oceania Ticket Contract_CE_MAY 2025.pdf',
  },
  {
    id: 'oceania-club-offer',
    title: 'Oceania Club — future cruise offer',
    description: 'Promotional offer for booking your next voyage on board.',
    filename: 'oce_oceaniaclub.pdf',
  },
]

export function finalCruiseSummaryHref(filename: string): string {
  return `/documents/${encodeURIComponent(FINAL_CRUISE_SUMMARY_FOLDER)}/${encodeURIComponent(filename)}`
}

export const finalCruiseSummaryDocuments: FinalCruiseSummaryDocument[] =
  FINAL_CRUISE_SUMMARY_FILES.map(({ id, title, description, filename }) => ({
    id,
    title,
    description,
    href: finalCruiseSummaryHref(filename),
  }))

export function selectFinalCruiseSummaryDocumentActions(
  ids: readonly string[],
): DocumentActionViewModel[] {
  return ids.flatMap((id) => {
    const document = finalCruiseSummaryDocuments.find(
      (candidate) => candidate.id === id,
    )
    return document
      ? [
          {
            id: `final-cruise-summary-${document.id}`,
            href: document.href,
            label: `Open ${document.title}`,
            title: document.title,
          },
        ]
      : []
  })
}
