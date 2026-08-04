import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  detectPushReadiness,
  getOrCreatePushInstallationId,
  getPushSubscriptionStatus,
  HttpPushSubscriptionApi,
  PushApiError,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  type PushSubscriptionApi,
} from './pushNotificationClient'

function fakeNavigator(overrides: Partial<Navigator> = {}): Navigator {
  return { serviceWorker: {} as ServiceWorker, ...overrides } as Navigator
}

function matchMediaMatching(matches: boolean) {
  return () =>
    ({ matches }) as MediaQueryList
}

describe('detectPushReadiness', () => {
  it('reports UNSUPPORTED when the browser lacks the required APIs', () => {
    const nav = {} as Navigator
    expect(detectPushReadiness(nav, { matchMedia: matchMediaMatching(false) })).toBe(
      'UNSUPPORTED',
    )
  })

  it('reports NEEDS_INSTALL for iOS Safari running outside standalone mode', () => {
    // deleted globals below don't exist in this jsdom run; simulate via a stubbed PushManager/Notification.
    vi.stubGlobal('PushManager', class {})
    vi.stubGlobal('Notification', class {})
    try {
      const nav = fakeNavigator({ standalone: false } as Partial<Navigator>)
      expect(
        detectPushReadiness(nav, { matchMedia: matchMediaMatching(false) }),
      ).toBe('NEEDS_INSTALL')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('reports READY for a standalone iOS install', () => {
    vi.stubGlobal('PushManager', class {})
    vi.stubGlobal('Notification', class {})
    try {
      const nav = fakeNavigator({ standalone: true } as Partial<Navigator>)
      expect(
        detectPushReadiness(nav, { matchMedia: matchMediaMatching(false) }),
      ).toBe('READY')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('reports READY for Android/desktop browsers without requiring standalone mode', () => {
    vi.stubGlobal('PushManager', class {})
    vi.stubGlobal('Notification', class {})
    try {
      const nav = fakeNavigator()
      expect(
        detectPushReadiness(nav, { matchMedia: matchMediaMatching(false) }),
      ).toBe('READY')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('getOrCreatePushInstallationId', () => {
  it('creates and persists an id on first use, then reuses it', () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
    } as Storage

    const first = getOrCreatePushInstallationId(storage)
    const second = getOrCreatePushInstallationId(storage)
    expect(first).toBe(second)
    expect(first.length).toBeGreaterThan(0)
  })

  it('still returns a usable id when storage throws', () => {
    const storage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    } as unknown as Storage

    expect(getOrCreatePushInstallationId(storage).length).toBeGreaterThan(0)
  })
})

describe('HttpPushSubscriptionApi', () => {
  it('posts a registration request with the expected shape', async () => {
    const fetchRequest = vi.fn(async () => new Response(null, { status: 200 }))
    const api = new HttpPushSubscriptionApi(fetchRequest)

    await api.registerSubscription({
      installationId: 'install-1',
      travelerId: 'traveler-yoav',
      endpoint: 'https://push.example/endpoint-1',
      keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      userAgent: 'test-agent',
    })

    expect(fetchRequest).toHaveBeenCalledWith(
      '/api/push/subscriptions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          installationId: 'install-1',
          travelerId: 'traveler-yoav',
          subscription: {
            endpoint: 'https://push.example/endpoint-1',
            keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
          },
          userAgent: 'test-agent',
        }),
      }),
    )
  })

  it('maps a non-ok response to a typed error', async () => {
    const fetchRequest = vi.fn(async () => new Response(null, { status: 410 }))
    const api = new HttpPushSubscriptionApi(fetchRequest)

    await expect(api.sendTestNotification('install-1')).rejects.toMatchObject({
      code: 'SUBSCRIPTION_EXPIRED',
    })
  })

  it('maps a network failure to NETWORK_FAILURE', async () => {
    const fetchRequest = vi.fn(async () => {
      throw new Error('offline')
    })
    const api = new HttpPushSubscriptionApi(fetchRequest)

    await expect(api.removeSubscription('install-1')).rejects.toEqual(
      new PushApiError('NETWORK_FAILURE'),
    )
  })
})

function fakeSubscription(
  overrides: Partial<{ endpoint: string; p256dh: string; auth: string }> = {},
): PushSubscription {
  const endpoint = overrides.endpoint ?? 'https://push.example/endpoint-1'
  const p256dh = overrides.p256dh ?? 'p256dh-key'
  const auth = overrides.auth ?? 'auth-key'
  return {
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh, auth } }),
    unsubscribe: vi.fn(async () => true),
  } as unknown as PushSubscription
}

function fakeRegistration(
  subscription: PushSubscription | null,
): ServiceWorkerRegistration {
  return {
    pushManager: {
      getSubscription: vi.fn(async () => subscription),
      subscribe: vi.fn(async () => subscription ?? fakeSubscription()),
    },
  } as unknown as ServiceWorkerRegistration
}

function stubApi(overrides: Partial<PushSubscriptionApi> = {}): PushSubscriptionApi {
  return {
    registerSubscription: vi.fn(async () => undefined),
    removeSubscription: vi.fn(async () => undefined),
    sendTestNotification: vi.fn(async () => undefined),
    ...overrides,
  }
}

describe('subscribeToPushNotifications', () => {
  beforeEach(() => {
    vi.stubGlobal('PushManager', class {})
    vi.stubGlobal('Notification', class {})
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {},
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('registers the subscription once permission is granted', async () => {
    const subscription = fakeSubscription()
    const registration = fakeRegistration(null)
    const api = stubApi()

    const result = await subscribeToPushNotifications({
      installationId: 'install-1',
      travelerId: 'traveler-yoav',
      vapidPublicKey: 'BLNSKuaFw53odDt9xWHEN7AHmcVJUmYjV9Y7Fs77Wbl4CKtzuRYNJURy-p7boSWC6kDq4ZCCoZ1q-b8-Zo3Vi78',
      api,
      requestPermission: async () => 'granted',
      getRegistration: async () => registration,
    })
    // subscribe() on the fake registration resolves with its own fakeSubscription()
    // when there was no existing subscription — assert the API call shape instead
    // of object identity.
    void subscription

    expect(result).toEqual({ status: 'SUBSCRIBED' })
    expect(api.registerSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        installationId: 'install-1',
        travelerId: 'traveler-yoav',
        endpoint: 'https://push.example/endpoint-1',
        keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      }),
    )
  })

  it('reuses an existing subscription instead of creating a new one', async () => {
    const subscription = fakeSubscription({ endpoint: 'https://push.example/existing' })
    const registration = fakeRegistration(subscription)
    const api = stubApi()

    await subscribeToPushNotifications({
      installationId: 'install-1',
      travelerId: 'traveler-yoav',
      vapidPublicKey: 'key',
      api,
      requestPermission: async () => 'granted',
      getRegistration: async () => registration,
    })

    expect(registration.pushManager.subscribe).not.toHaveBeenCalled()
    expect(api.registerSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://push.example/existing' }),
    )
  })

  it('reports PERMISSION_DENIED without registering anything', async () => {
    const api = stubApi()
    const result = await subscribeToPushNotifications({
      installationId: 'install-1',
      travelerId: 'traveler-yoav',
      vapidPublicKey: 'key',
      api,
      requestPermission: async () => 'denied',
      getRegistration: async () => fakeRegistration(null),
    })
    expect(result).toEqual({ status: 'PERMISSION_DENIED' })
    expect(api.registerSubscription).not.toHaveBeenCalled()
  })

  it('never requests permission automatically — only when the caller invokes it', async () => {
    const requestPermission = vi.fn(async (): Promise<NotificationPermission> => 'granted')
    await subscribeToPushNotifications({
      installationId: 'install-1',
      travelerId: 'traveler-yoav',
      vapidPublicKey: 'key',
      api: stubApi(),
      requestPermission,
      getRegistration: async () => fakeRegistration(null),
    })
    expect(requestPermission).toHaveBeenCalledTimes(1)
  })
})

describe('unsubscribeFromPushNotifications', () => {
  it('unsubscribes locally and removes the server-side registration', async () => {
    const subscription = fakeSubscription()
    const registration = fakeRegistration(subscription)
    const api = stubApi()

    await unsubscribeFromPushNotifications({
      installationId: 'install-1',
      api,
      getRegistration: async () => registration,
    })

    expect(subscription.unsubscribe).toHaveBeenCalled()
    expect(api.removeSubscription).toHaveBeenCalledWith('install-1')
  })

  it('still removes the server-side registration when there is no local subscription', async () => {
    const registration = fakeRegistration(null)
    const api = stubApi()

    await unsubscribeFromPushNotifications({
      installationId: 'install-1',
      api,
      getRegistration: async () => registration,
    })

    expect(api.removeSubscription).toHaveBeenCalledWith('install-1')
  })
})

describe('getPushSubscriptionStatus', () => {
  it('reports ACTIVE when a subscription exists', async () => {
    const registration = fakeRegistration(fakeSubscription())
    await expect(
      getPushSubscriptionStatus(async () => registration),
    ).resolves.toBe('ACTIVE')
  })

  it('reports INACTIVE when there is none, or the registration is unavailable', async () => {
    await expect(
      getPushSubscriptionStatus(async () => fakeRegistration(null)),
    ).resolves.toBe('INACTIVE')
    await expect(
      getPushSubscriptionStatus(async () => {
        throw new Error('no registration')
      }),
    ).resolves.toBe('INACTIVE')
  })
})
