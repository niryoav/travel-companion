import { describe, expect, it } from 'vitest'

import { tripContentFixture } from '../../test/fixtures/tripContentFixture'
import { tripFixture } from '../../test/fixtures/tripFixture'
import { BundledTripContentRepository } from './BundledTripContentRepository'

describe('BundledTripContentRepository', () => {
  it('returns validated bundled content for its trip', () => {
    const repository = new BundledTripContentRepository(
      tripContentFixture,
      tripFixture,
    )

    expect(
      repository.getContentForTrip('trip-northern-coast-fixture'),
    ).toBe(tripContentFixture)
  })

  it('returns null for an unknown trip', () => {
    const repository = new BundledTripContentRepository(
      tripContentFixture,
      tripFixture,
    )

    expect(repository.getContentForTrip('trip-unknown')).toBeNull()
  })

  it('rejects content linked to a different trip', () => {
    expect(
      () =>
        new BundledTripContentRepository(
          { ...tripContentFixture, tripId: 'trip-other' },
          tripFixture,
        ),
    ).toThrow('Content trip does not match trip data')
  })
})
