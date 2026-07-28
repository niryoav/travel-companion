import { describe, expect, it, vi } from 'vitest'

import { LocalTripStateRepository } from './LocalTripStateRepository'

const activeTripId = 'trip-northern-coast-fixture'
const travelerIds = new Set(['traveler-alex', 'traveler-sam'])

describe('LocalTripStateRepository', () => {
  it('stores stable traveler IDs in a versioned envelope', () => {
    const repository = new LocalTripStateRepository(
      window.localStorage,
      activeTripId,
      travelerIds,
    )

    repository.setTravelerId('traveler-sam')

    expect(repository.getTravelerId()).toBe('traveler-sam')
    expect(
      JSON.parse(
        window.localStorage.getItem('travel-companion:trip-state') ?? '',
      ),
    ).toEqual({
      schemaVersion: 2,
      activeTripId,
      travelerId: 'traveler-sam',
    })
  })

  it.each([
    ['Yoav', 'traveler-yoav'],
    ['Isabel', 'traveler-isabel'],
  ])('migrates the legacy %s profile without setup', (legacy, expected) => {
    window.localStorage.setItem(
      'travel-companion:traveler-profile',
      legacy,
    )
    const repository = new LocalTripStateRepository(
      window.localStorage,
      'trip-oceania-marina-2026',
      new Set(['traveler-yoav', 'traveler-isabel']),
    )

    expect(repository.getTravelerId()).toBe(expected)
    expect(
      JSON.parse(
        window.localStorage.getItem('travel-companion:trip-state') ?? '',
      ),
    ).toMatchObject({
      schemaVersion: 2,
      travelerId: expected,
    })
  })

  it('ignores unsupported stored traveler IDs', () => {
    window.localStorage.setItem(
      'travel-companion:trip-state',
      JSON.stringify({
        schemaVersion: 1,
        activeTripId,
        travelerId: 'traveler-unknown',
      }),
    )
    const repository = new LocalTripStateRepository(
      window.localStorage,
      activeTripId,
      travelerIds,
    )

    expect(repository.getTravelerId()).toBeNull()
  })

  it('persists the active trip without requiring a traveler selection', () => {
    const repository = new LocalTripStateRepository(
      window.localStorage,
      activeTripId,
      travelerIds,
    )

    expect(repository.getActiveTripId()).toBeNull()
    repository.activateTrip()

    const restarted = new LocalTripStateRepository(
      window.localStorage,
      activeTripId,
      travelerIds,
    )
    expect(restarted.getActiveTripId()).toBe(activeTripId)
    expect(restarted.getTravelerId()).toBeNull()
  })

  it('persists route and document round-trip state across process restart', () => {
    const repository = new LocalTripStateRepository(
      window.localStorage,
      activeTripId,
      travelerIds,
    )
    repository.activateTrip()
    repository.setLastMeaningfulRoute('/trip')
    repository.beginDocumentRoundTrip({
      originatedFromDocumentAction: true,
      sourceRoute: '/trip',
      documentId: 'document-example',
      openedAt: '2030-05-01T12:00:00.000Z',
    })

    const restarted = new LocalTripStateRepository(
      window.localStorage,
      activeTripId,
      travelerIds,
    )
    expect(restarted.getLastMeaningfulRoute()).toBe('/trip')
    expect(restarted.getDocumentRoundTrip()).toEqual({
      originatedFromDocumentAction: true,
      sourceRoute: '/trip',
      documentId: 'document-example',
      openedAt: '2030-05-01T12:00:00.000Z',
    })

    restarted.clearDocumentRoundTrip()
    expect(restarted.getDocumentRoundTrip()).toBeNull()
  })

  it('keeps the active trip when a malformed document marker is discarded', () => {
    window.localStorage.setItem(
      'travel-companion:trip-state',
      JSON.stringify({
        schemaVersion: 2,
        activeTripId,
        documentRoundTrip: {
          sourceRoute: '/trip',
          documentId: 'document-example',
          openedAt: '2030-05-01T12:00:00.000Z',
        },
      }),
    )

    const repository = new LocalTripStateRepository(
      window.localStorage,
      activeTripId,
      travelerIds,
    )

    expect(repository.getActiveTripId()).toBe(activeTripId)
    expect(repository.getDocumentRoundTrip()).toBeNull()
  })

  it('degrades safely when browser storage is unavailable', () => {
    const unavailableStorage = {
      getItem: vi.fn(() => {
        throw new Error('Storage unavailable')
      }),
      setItem: vi.fn(() => {
        throw new Error('Storage unavailable')
      }),
    } as unknown as Storage
    const repository = new LocalTripStateRepository(
      unavailableStorage,
      activeTripId,
      travelerIds,
    )

    expect(repository.getTravelerId()).toBeNull()
    expect(() => repository.activateTrip()).not.toThrow()
    expect(repository.getActiveTripId()).toBe(activeTripId)
    expect(() => repository.setTravelerId('traveler-alex')).not.toThrow()
    expect(repository.getTravelerId()).toBe('traveler-alex')
  })
})
