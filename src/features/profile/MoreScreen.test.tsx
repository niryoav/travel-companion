import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PwaUpdateManager } from '../../pwa/PwaUpdateManager'
import { LocalTripOverrideRepository } from '../../storage/LocalTripOverrideRepository'
import type { TripStateRepository } from '../../storage/TripStateRepository'
import { tripFixture } from '../../test/fixtures/tripFixture'
import { oceaniaMarina2026TripData } from '../../trips/oceania-marina-2026/tripData'
import { MoreScreen } from './MoreScreen'

describe('MoreScreen role-based trip status', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('shows Isabel only freshness information without trip sync controls', () => {
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      tripFixture,
      undefined,
      undefined,
      {
        baseRevision: 4,
        lastModified: '2030-05-10T12:00:00Z',
        lastSuccessfulSyncAt: '2030-05-10T12:00:00Z',
        syncState: 'synced',
      },
    )
    render(
      <MoreScreen
        appBuildInfo={{
          buildLabel: '10 May 2030, 14:00',
          builtAt: '2030-05-10T12:00:00Z',
          environmentLabel: 'Production',
          version: '97b35d2',
        }}
        pwaUpdateManager={new PwaUpdateManager(false)}
        travelers={oceaniaMarina2026TripData.travelers}
        tripDataVersion="test-data"
        tripOverrideRepository={repository}
        tripStateRepository={
          {
            getTravelerId: () => 'traveler-isabel',
            setTravelerId: () => {},
          } as unknown as TripStateRepository
        }
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Up to date' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Last synced:/)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /sync|retry|trip update/i }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
    expect(screen.queryByText('Synced')).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(
      /Conflict|Shared version changed/i,
    )

    const deploymentHeading = screen.getByRole('heading', {
      name: 'App version',
    })
    const deploymentCard = deploymentHeading.closest('.app-information-card')
    const syncHeading = screen.getByRole('heading', { name: 'Up to date' })
    const syncCard = syncHeading.closest('.trip-data-status')

    expect(deploymentCard).not.toBe(syncCard)
    expect(deploymentCard).toHaveTextContent('97b35d2')
    expect(deploymentCard).toHaveTextContent('Deployed: 10 May 2030, 14:00')
    expect(deploymentCard).not.toHaveTextContent(
      /Saved|Synced|Up to date|Last synced/,
    )
  })

  it('renders build-injected information without requesting the Vercel API', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const repository = new LocalTripOverrideRepository(
      window.localStorage,
      tripFixture,
    )

    render(
      <MoreScreen
        appBuildInfo={{
          buildLabel: '30 Jul 2026, 18:32',
          builtAt: '2026-07-30T16:32:00Z',
          environmentLabel: 'Production',
          version: 'abc1234',
        }}
        pwaUpdateManager={new PwaUpdateManager(false)}
        travelers={oceaniaMarina2026TripData.travelers}
        tripDataVersion="test-data"
        tripOverrideRepository={repository}
        tripStateRepository={
          {
            getTravelerId: () => 'traveler-yoav',
            setTravelerId: () => {},
          } as unknown as TripStateRepository
        }
      />,
    )

    expect(screen.getByRole('heading', { name: 'App version' }))
      .toBeInTheDocument()
    expect(screen.getByText('abc1234')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Saved' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /sync|retry|trip update/i }),
    ).not.toBeInTheDocument()

    act(() => {
      repository.acceptSyncedSnapshot({
        tripId: tripFixture.trip.id,
        schemaVersion: 1,
        revision: 1,
        updatedAt: '2030-05-10T13:00:00Z',
        updatedBy: 'yoav',
        operationalOverrides: repository.getSnapshot(),
      })
    })
    expect(
      screen.getByRole('heading', { name: 'Synced' }),
    ).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
