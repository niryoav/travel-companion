import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'

import { DocumentActionLink } from '../features/documents/components/DocumentActionLink'
import { LocalTripStateRepository } from '../storage/LocalTripStateRepository'
import { tripFixture } from '../test/fixtures/tripFixture'
import { TripLifecycleProvider } from './TripLifecycleProvider'

const action = {
  id: 'document-example',
  href: '/documents/example.pdf',
  label: 'Open document',
  title: 'Example document',
}

function createRepository() {
  return new LocalTripStateRepository(
    window.localStorage,
    tripFixture.trip.id,
    new Set(tripFixture.travelers.map(({ id }) => id)),
  )
}

describe('TripLifecycleProvider document round-trips', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it.each(['/trip', '/documents', '/home'] as const)(
    'records a PDF opened from %s before native navigation',
    (sourceRoute) => {
      const repository = createRepository()
      repository.activateTrip()

      render(
        <MemoryRouter initialEntries={[sourceRoute]}>
          <TripLifecycleProvider
            activeTripId={tripFixture.trip.id}
            tripStateRepository={repository}
          >
            <DocumentActionLink action={action} />
          </TripLifecycleProvider>
        </MemoryRouter>,
      )

      fireEvent.click(
        screen.getByRole('link', { name: 'Open document' }),
      )

      const persisted = createRepository().getDocumentRoundTrip()
      expect(persisted).toMatchObject({
        originatedFromDocumentAction: true,
        sourceRoute,
        documentId: 'document-example',
      })
      expect(Date.parse(persisted?.openedAt ?? '')).not.toBeNaN()
    },
  )
})
