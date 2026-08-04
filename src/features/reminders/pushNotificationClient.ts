import type { TravelerId } from '../../domain/trip/tripTypes'

export type PushReadiness = 'UNSUPPORTED' | 'NEEDS_INSTALL' | 'READY'

interface IosNavigator extends Navigator {
  standalone?: boolean
}

/** `navigator.standalone` only exists on iOS/iPadOS Safari — a feature check, not user-agent sniffing. */
export function isIosSafariLike(nav: Navigator = navigator): boolean {
  return 'standalone' in nav
}

export function isStandalonePwa(
  nav: Navigator = navigator,
  win: Pick<Window, 'matchMedia'> = window,
): boolean {
  const iosNav = nav as IosNavigator
  return (
    win.matchMedia('(display-mode: standalone)').matches ||
    iosNav.standalone === true
  )
}

export function detectPushSupport(nav: Navigator = navigator): boolean {
  return (
    'serviceWorker' in nav &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    typeof Notification !== 'undefined'
  )
}

/**
 * iPhone only delivers Web Push to a Home-Screen-installed PWA — a browser
 * tab silently never receives anything, so that case needs its own
 * "install first" message rather than looking like a generic failure.
 */
export function detectPushReadiness(
  nav: Navigator = navigator,
  win: Pick<Window, 'matchMedia'> = window,
): PushReadiness {
  if (!detectPushSupport(nav)) {
    return 'UNSUPPORTED'
  }
  if (isIosSafariLike(nav) && !isStandalonePwa(nav, win)) {
    return 'NEEDS_INSTALL'
  }
  return 'READY'
}

const PUSH_INSTALLATION_ID_KEY = 'travel-companion:push-installation-id'

/** A random per-device id — not a user account, just enough to target this browser's subscription. */
export function getOrCreatePushInstallationId(storage: Storage): string {
  try {
    const existing = storage.getItem(PUSH_INSTALLATION_ID_KEY)
    if (existing) {
      return existing
    }
  } catch {
    // Fall through to a session-only id below.
  }
  const created = crypto.randomUUID()
  try {
    storage.setItem(PUSH_INSTALLATION_ID_KEY, created)
  } catch {
    // Storage unavailable; the id still works for the current session.
  }
  return created
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0))
}

export interface PushSubscriptionKeys {
  p256dh: string
  auth: string
}

export interface RegisterSubscriptionInput {
  installationId: string
  travelerId: TravelerId
  endpoint: string
  keys: PushSubscriptionKeys
  userAgent?: string
}

export type PushApiFailure =
  | 'NETWORK_FAILURE'
  | 'INVALID_REQUEST'
  | 'SERVER_ERROR'
  | 'SUBSCRIPTION_NOT_FOUND'
  | 'SUBSCRIPTION_EXPIRED'
  | 'PUSH_NOT_CONFIGURED'

export class PushApiError extends Error {
  constructor(readonly code: PushApiFailure) {
    super(code)
    this.name = 'PushApiError'
  }
}

export interface PushSubscriptionApi {
  registerSubscription(input: RegisterSubscriptionInput): Promise<void>
  removeSubscription(installationId: string): Promise<void>
  sendTestNotification(installationId: string): Promise<void>
}

const CODE_BY_STATUS: Partial<Record<number, PushApiFailure>> = {
  400: 'INVALID_REQUEST',
  404: 'SUBSCRIPTION_NOT_FOUND',
  410: 'SUBSCRIPTION_EXPIRED',
  503: 'PUSH_NOT_CONFIGURED',
}

async function postJson(
  fetchRequest: typeof fetch,
  url: string,
  method: 'POST' | 'DELETE',
  body: unknown,
): Promise<void> {
  let response: Response
  try {
    response = await fetchRequest(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new PushApiError('NETWORK_FAILURE')
  }
  if (!response.ok) {
    throw new PushApiError(CODE_BY_STATUS[response.status] ?? 'SERVER_ERROR')
  }
}

export class HttpPushSubscriptionApi implements PushSubscriptionApi {
  constructor(private readonly fetchRequest: typeof fetch = fetch) {}

  registerSubscription(input: RegisterSubscriptionInput): Promise<void> {
    return postJson(this.fetchRequest, '/api/push/subscriptions', 'POST', {
      installationId: input.installationId,
      travelerId: input.travelerId,
      subscription: { endpoint: input.endpoint, keys: input.keys },
      userAgent: input.userAgent,
    })
  }

  removeSubscription(installationId: string): Promise<void> {
    return postJson(this.fetchRequest, '/api/push/subscriptions', 'DELETE', {
      installationId,
    })
  }

  sendTestNotification(installationId: string): Promise<void> {
    return postJson(this.fetchRequest, '/api/push/test', 'POST', {
      installationId,
    })
  }
}

export type PushSubscribeResult =
  | { status: 'SUBSCRIBED' }
  | { status: 'PERMISSION_DENIED' }
  | { status: 'UNSUPPORTED' }
  | { status: 'FAILED'; error: string }

export interface PushSubscribeDependencies {
  installationId: string
  travelerId: TravelerId
  vapidPublicKey: string
  api: PushSubscriptionApi
  getRegistration?: () => Promise<ServiceWorkerRegistration>
  requestPermission?: () => Promise<NotificationPermission>
}

function subscriptionKeys(
  subscription: PushSubscription,
): PushSubscriptionKeys | null {
  const json = subscription.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  return p256dh && auth ? { p256dh, auth } : null
}

export async function subscribeToPushNotifications(
  deps: PushSubscribeDependencies,
): Promise<PushSubscribeResult> {
  if (!detectPushSupport()) {
    return { status: 'UNSUPPORTED' }
  }

  const requestPermission =
    deps.requestPermission ?? (() => Notification.requestPermission())
  const permission = await requestPermission()
  if (permission !== 'granted') {
    return { status: 'PERMISSION_DENIED' }
  }

  const getRegistration =
    deps.getRegistration ?? (() => navigator.serviceWorker.ready)

  try {
    const registration = await getRegistration()
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(deps.vapidPublicKey),
      }))

    const keys = subscriptionKeys(subscription)
    if (!keys) {
      return { status: 'FAILED', error: 'Subscription is missing encryption keys' }
    }

    await deps.api.registerSubscription({
      installationId: deps.installationId,
      travelerId: deps.travelerId,
      endpoint: subscription.endpoint,
      keys,
      userAgent: navigator.userAgent,
    })
    return { status: 'SUBSCRIBED' }
  } catch (error) {
    return {
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'Unknown push error',
    }
  }
}

export interface PushUnsubscribeDependencies {
  installationId: string
  api: PushSubscriptionApi
  getRegistration?: () => Promise<ServiceWorkerRegistration>
}

export async function unsubscribeFromPushNotifications(
  deps: PushUnsubscribeDependencies,
): Promise<void> {
  const getRegistration =
    deps.getRegistration ?? (() => navigator.serviceWorker.ready)
  const registration = await getRegistration()
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    await subscription.unsubscribe()
  }
  await deps.api.removeSubscription(deps.installationId)
}

export type PushSubscriptionStatus = 'ACTIVE' | 'INACTIVE'

export async function getPushSubscriptionStatus(
  getRegistration: () => Promise<ServiceWorkerRegistration> = () =>
    navigator.serviceWorker.ready,
): Promise<PushSubscriptionStatus> {
  try {
    const registration = await getRegistration()
    const subscription = await registration.pushManager.getSubscription()
    return subscription ? 'ACTIVE' : 'INACTIVE'
  } catch {
    return 'INACTIVE'
  }
}
