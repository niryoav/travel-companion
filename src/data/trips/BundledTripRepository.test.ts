import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../test/fixtures/tripFixture'
import { BundledTripRepository } from './BundledTripRepository'

describe('BundledTripRepository', () => {
  it('returns the active bundled trip and its version metadata', () => {
    const repository = new BundledTripRepository(tripFixture)

    expect(repository.getActiveTrip().trip.id).toBe(
      'trip-northern-coast-fixture',
    )
    expect(repository.getActiveTrip().schemaVersion).toBe(1)
    expect(repository.getActiveTrip().dataVersion).toBe('fixture-1')
  })

  it('returns null for an unknown trip ID', () => {
    const repository = new BundledTripRepository(tripFixture)

    expect(repository.getTrip('trip-missing')).toBeNull()
  })
})
