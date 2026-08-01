import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { oceaniaMarina2026TripData } from '../../trips/oceania-marina-2026/tripData'
import { tripFixture } from '../../test/fixtures/tripFixture'
import { createDocumentFixture } from '../../test/fixtures/documentFixture'
import { DocumentsScreen } from './DocumentsScreen'
import { selectDocumentsViewModel } from './selectors/selectDocumentsViewModel'

describe('DocumentsScreen', () => {
  it('groups practical production documents without empty categories', () => {
    render(
      <MemoryRouter>
        <DocumentsScreen tripData={oceaniaMarina2026TripData} />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Documents' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Hotel' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Transfers' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Independent excursions' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Available offline')).toHaveLength(9)
    expect(
      screen.getByRole('link', { name: 'Restaurant menus' }),
    ).toHaveAttribute('href', '/documents/restaurant-menus')
    expect(
      screen.getByRole('link', { name: 'Activities & entertainment' }),
    ).toHaveAttribute('href', '/documents/activities')
    expect(
      screen.getByRole('link', { name: 'Deck plans' }),
    ).toHaveAttribute('href', '/documents/deckplans')
    expect(screen.queryByRole('heading', { name: 'Flights' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Cruise' })).not.toBeInTheDocument()
  })

  it('uses local PDF actions and presents the superseded schedule warning', () => {
    render(
      <MemoryRouter>
        <DocumentsScreen tripData={oceaniaMarina2026TripData} />
      </MemoryRouter>,
    )

    const ticket = screen.getByRole('link', {
      name: 'Open excursion ticket',
    })
    expect(ticket).toHaveAttribute(
      'href',
      '/documents/travel/djupivogur-glacier-tour-ticket.pdf',
    )
    expect(ticket).toHaveAttribute('target', '_blank')
    expect(screen.getByText(/time printed in this document is superseded/i))
      .toBeInTheDocument()
  })

  it('omits groups that have no matching documents', () => {
    const data = {
      ...tripFixture,
      documentReferences: [
        createDocumentFixture({
          category: 'HOTEL',
          title: 'Fictional harbor hotel',
        }),
      ],
    }
    const viewModel = selectDocumentsViewModel(data)

    expect(viewModel.groups).toHaveLength(1)
    expect(viewModel.groups[0]).toMatchObject({
      id: 'HOTEL',
      title: 'Hotel',
    })
  })

  it('renders an intentional empty state when no documents are approved', () => {
    render(
      <MemoryRouter>
        <DocumentsScreen
          tripData={{ ...tripFixture, documentReferences: [] }}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'No travel documents available' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Restaurant menus' }),
    ).toBeInTheDocument()
  })
})
