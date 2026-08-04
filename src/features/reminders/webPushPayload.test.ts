import { describe, expect, it } from 'vitest'

import {
  hasNotificationLaunchMarker,
  withNotificationLaunchMarker,
} from './webPushPayload'

describe('withNotificationLaunchMarker', () => {
  it('appends the marker to a bare path', () => {
    expect(withNotificationLaunchMarker('/more')).toBe(
      '/more?source=notification',
    )
  })

  it('appends the marker to a path that already has a query string', () => {
    expect(withNotificationLaunchMarker('/trip?foo=bar')).toBe(
      '/trip?foo=bar&source=notification',
    )
  })
})

describe('hasNotificationLaunchMarker', () => {
  it('recognizes the exact marker', () => {
    expect(hasNotificationLaunchMarker('?source=notification')).toBe(true)
    expect(hasNotificationLaunchMarker('source=notification')).toBe(true)
  })

  it('does not match an unrelated or malformed query string', () => {
    expect(hasNotificationLaunchMarker('')).toBe(false)
    expect(hasNotificationLaunchMarker('?foo=bar')).toBe(false)
    expect(hasNotificationLaunchMarker('?source=something-else')).toBe(false)
    expect(hasNotificationLaunchMarker('?source=notification-extra')).toBe(
      false,
    )
  })
})
