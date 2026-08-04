import { describe, expect, it, vi } from 'vitest'

import {
  handleNotificationClickNavigation,
  type NotificationClickClient,
} from './notificationClickNavigation'

function fakeClient(
  url: string,
  overrides: Partial<NotificationClickClient> = {},
): NotificationClickClient {
  return {
    url,
    focus: vi.fn(async () => undefined),
    ...overrides,
  }
}

describe('handleNotificationClickNavigation', () => {
  it('opens a new window at the target URL when no client is open', async () => {
    const matchClients = vi.fn(async () => [])
    const openWindow = vi.fn(async () => undefined)

    await handleNotificationClickNavigation(
      new URL('https://travel-companion.example/more'),
      matchClients,
      openWindow,
    )

    expect(openWindow).toHaveBeenCalledWith('https://travel-companion.example/more')
  })

  it('navigates and focuses an existing client sitting on the welcome screen', async () => {
    const navigatedClient = fakeClient('https://travel-companion.example/more')
    const welcomeClient = fakeClient('https://travel-companion.example/welcome', {
      navigate: vi.fn(async () => navigatedClient),
    })
    const matchClients = vi.fn(async () => [welcomeClient])
    const openWindow = vi.fn(async () => undefined)

    await handleNotificationClickNavigation(
      new URL('https://travel-companion.example/more'),
      matchClients,
      openWindow,
    )

    expect(welcomeClient.navigate).toHaveBeenCalledWith(
      'https://travel-companion.example/more',
    )
    expect(navigatedClient.focus).toHaveBeenCalledTimes(1)
    expect(openWindow).not.toHaveBeenCalled()
  })

  it('navigates and focuses an existing client sitting on an unrelated route', async () => {
    const navigatedClient = fakeClient('https://travel-companion.example/more')
    const todayClient = fakeClient('https://travel-companion.example/today', {
      navigate: vi.fn(async () => navigatedClient),
    })
    const matchClients = vi.fn(async () => [todayClient])
    const openWindow = vi.fn(async () => undefined)

    await handleNotificationClickNavigation(
      new URL('https://travel-companion.example/more'),
      matchClients,
      openWindow,
    )

    expect(todayClient.navigate).toHaveBeenCalledWith(
      'https://travel-companion.example/more',
    )
    expect(navigatedClient.focus).toHaveBeenCalledTimes(1)
    expect(openWindow).not.toHaveBeenCalled()
  })

  it('only focuses a client already at the destination, without navigating or opening a duplicate window', async () => {
    const moreClient = fakeClient('https://travel-companion.example/more', {
      navigate: vi.fn(async () => moreClient),
    })
    const matchClients = vi.fn(async () => [moreClient])
    const openWindow = vi.fn(async () => undefined)

    await handleNotificationClickNavigation(
      new URL('https://travel-companion.example/more'),
      matchClients,
      openWindow,
    )

    expect(moreClient.focus).toHaveBeenCalledTimes(1)
    expect(moreClient.navigate).not.toHaveBeenCalled()
    expect(openWindow).not.toHaveBeenCalled()
  })

  it('treats a different hash on the same path as a different destination (e.g. /trip#day-1 vs /trip#day-2)', async () => {
    const navigatedClient = fakeClient(
      'https://travel-companion.example/trip#day-2026-08-25',
    )
    const tripClient = fakeClient(
      'https://travel-companion.example/trip#day-2026-08-22',
      { navigate: vi.fn(async () => navigatedClient) },
    )
    const matchClients = vi.fn(async () => [tripClient])
    const openWindow = vi.fn(async () => undefined)

    await handleNotificationClickNavigation(
      new URL('https://travel-companion.example/trip#day-2026-08-25'),
      matchClients,
      openWindow,
    )

    expect(tripClient.navigate).toHaveBeenCalledWith(
      'https://travel-companion.example/trip#day-2026-08-25',
    )
  })

  it('falls back to opening a window when navigate() throws instead of leaving the user on the wrong screen', async () => {
    const brokenClient = fakeClient('https://travel-companion.example/welcome', {
      navigate: vi.fn(async () => {
        throw new Error('navigate is not supported here')
      }),
    })
    const matchClients = vi.fn(async () => [brokenClient])
    const openWindow = vi.fn(async () => undefined)

    await handleNotificationClickNavigation(
      new URL('https://travel-companion.example/more'),
      matchClients,
      openWindow,
    )

    expect(openWindow).toHaveBeenCalledWith('https://travel-companion.example/more')
  })

  it('falls back to opening a window when navigate() resolves to null', async () => {
    const brokenClient = fakeClient('https://travel-companion.example/welcome', {
      navigate: vi.fn(async () => null),
    })
    const matchClients = vi.fn(async () => [brokenClient])
    const openWindow = vi.fn(async () => undefined)

    await handleNotificationClickNavigation(
      new URL('https://travel-companion.example/more'),
      matchClients,
      openWindow,
    )

    expect(openWindow).toHaveBeenCalledWith('https://travel-companion.example/more')
  })

  it('opens a new window at the target when no navigate() method exists on the client at all', async () => {
    const clientWithoutNavigate = fakeClient(
      'https://travel-companion.example/welcome',
    )
    const matchClients = vi.fn(async () => [clientWithoutNavigate])
    const openWindow = vi.fn(async () => undefined)

    await handleNotificationClickNavigation(
      new URL('https://travel-companion.example/more'),
      matchClients,
      openWindow,
    )

    expect(openWindow).toHaveBeenCalledWith('https://travel-companion.example/more')
  })

  it('works the same way on a Vercel Preview origin, with no hardcoded hostname involved', async () => {
    const previewOrigin = 'https://travel-companion-git-my-feature-branch.vercel.app'
    const matchClients = vi.fn(async () => [])
    const openWindow = vi.fn(async () => undefined)

    await handleNotificationClickNavigation(
      new URL(`${previewOrigin}/more`),
      matchClients,
      openWindow,
    )

    expect(openWindow).toHaveBeenCalledWith(`${previewOrigin}/more`)
  })

  it('ignores a client from a different origin (e.g. a stale/foreign window) rather than navigating it', async () => {
    const foreignClient = fakeClient('https://not-this-app.example/more', {
      navigate: vi.fn(async () => foreignClient),
    })
    const matchClients = vi.fn(async () => [foreignClient])
    const openWindow = vi.fn(async () => undefined)

    await handleNotificationClickNavigation(
      new URL('https://travel-companion.example/more'),
      matchClients,
      openWindow,
    )

    expect(foreignClient.navigate).not.toHaveBeenCalled()
    expect(openWindow).toHaveBeenCalledWith('https://travel-companion.example/more')
  })
})

describe('handleNotificationClickNavigation — notification-launch-marked URLs', () => {
  // The daily test push and "Send test notification" both target
  // /more?source=notification (see webPushPayload.ts) so a cold app launch
  // preserves /more instead of being redirected by StartupRouteGate. This
  // module doesn't need to know about the marker at all — it should just
  // treat the marked URL like any other target.
  const markedUrl = new URL(
    'https://travel-companion.example/more?source=notification',
  )

  it('opens a new window at the marked URL when no client is open', async () => {
    const matchClients = vi.fn(async () => [])
    const openWindow = vi.fn(async () => undefined)

    await handleNotificationClickNavigation(markedUrl, matchClients, openWindow)

    expect(openWindow).toHaveBeenCalledWith(markedUrl.href)
  })

  it('navigates an existing welcome-screen client to the marked URL and focuses it', async () => {
    const navigatedClient = fakeClient(markedUrl.href)
    const welcomeClient = fakeClient('https://travel-companion.example/welcome', {
      navigate: vi.fn(async () => navigatedClient),
    })
    const matchClients = vi.fn(async () => [welcomeClient])
    const openWindow = vi.fn(async () => undefined)

    await handleNotificationClickNavigation(markedUrl, matchClients, openWindow)

    expect(welcomeClient.navigate).toHaveBeenCalledWith(markedUrl.href)
    expect(navigatedClient.focus).toHaveBeenCalledTimes(1)
    expect(openWindow).not.toHaveBeenCalled()
  })
})
