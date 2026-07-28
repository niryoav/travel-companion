import { describe, expect, it } from 'vitest'

import {
  documentRestorationTarget,
  meaningfulInternalRoute,
} from './routeRestoration'

const now = new Date('2030-05-01T12:00:00Z')

describe('meaningful internal route persistence', () => {
  it.each([
    ['/home', '', '/home'],
    ['/today', '', '/today'],
    ['/trip', '', '/trip'],
    ['/documents', '', '/documents'],
    ['/more', '', '/more'],
    ['/today', '?state=port-day', '/today?state=port-day'],
  ])('accepts %s%s', (pathname, search, expected) => {
    expect(meaningfulInternalRoute(pathname, search)).toBe(expected)
  })

  it.each([
    ['/welcome', ''],
    ['/profile-setup', ''],
    ['/missing', ''],
    ['/documents', '?state=unexpected'],
    ['/trip', '?external=true'],
  ])('rejects %s%s', (pathname, search) => {
    expect(meaningfulInternalRoute(pathname, search)).toBeNull()
  })
})

describe('document round-trip restoration', () => {
  it.each(['/trip', '/documents', '/home'])(
    'restores %s before date-based startup routing',
    (sourceRoute) => {
      expect(
        documentRestorationTarget(
          true,
          {
            originatedFromDocumentAction: true,
            sourceRoute,
            documentId: 'document-example',
            openedAt: '2030-05-01T11:55:00Z',
          },
          now,
        ),
      ).toBe(sourceRoute)
    },
  )

  it('falls back to Documents for an invalid stored source route', () => {
    expect(
      documentRestorationTarget(
        true,
        {
          originatedFromDocumentAction: true,
          sourceRoute: '/missing',
          documentId: 'document-example',
          openedAt: '2030-05-01T11:55:00Z',
        },
        now,
      ),
    ).toBe('/documents')
  })

  it('ignores restoration without the configured active trip', () => {
    expect(
      documentRestorationTarget(
        false,
        {
          originatedFromDocumentAction: true,
          sourceRoute: '/trip',
          documentId: 'document-example',
          openedAt: '2030-05-01T11:55:00Z',
        },
        now,
      ),
    ).toBeNull()
  })

  it.each([
    'not-an-instant',
    '2030-04-29T11:59:59Z',
    '2030-05-01T12:00:01Z',
  ])('ignores an invalid or stale timestamp: %s', (openedAt) => {
    expect(
      documentRestorationTarget(
        true,
        {
          originatedFromDocumentAction: true,
          sourceRoute: '/trip',
          documentId: 'document-example',
          openedAt,
        },
        now,
      ),
    ).toBeNull()
  })
})
