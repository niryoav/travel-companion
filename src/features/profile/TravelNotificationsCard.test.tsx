import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TravelNotificationsCard } from './TravelNotificationsCard'
import * as pushNotificationClient from '../reminders/pushNotificationClient'

const { sendTestNotification, registerSubscription, removeSubscription } =
  vi.hoisted(() => ({
    sendTestNotification: vi.fn(async () => undefined),
    registerSubscription: vi.fn(async () => undefined),
    removeSubscription: vi.fn(async () => undefined),
  }))

vi.mock('../reminders/pushNotificationClient', async () => {
  const actual = await vi.importActual<
    typeof import('../reminders/pushNotificationClient')
  >('../reminders/pushNotificationClient')
  return {
    ...actual,
    detectPushReadiness: vi.fn(),
    getOrCreatePushInstallationId: vi.fn(() => 'install-test-1'),
    getPushSubscriptionStatus: vi.fn(),
    subscribeToPushNotifications: vi.fn(),
    unsubscribeFromPushNotifications: vi.fn(async () => undefined),
    HttpPushSubscriptionApi: vi.fn().mockImplementation(() => ({
      registerSubscription,
      removeSubscription,
      sendTestNotification,
    })),
  }
})

const mocked = vi.mocked(pushNotificationClient)

beforeEach(() => {
  vi.stubGlobal(
    'Notification',
    Object.assign(vi.fn(), { permission: 'default' }),
  )
  vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'test-public-key')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('TravelNotificationsCard', () => {
  it('reports unsupported browsers without offering an action', async () => {
    mocked.detectPushReadiness.mockReturnValue('UNSUPPORTED')

    render(<TravelNotificationsCard travelerId="traveler-yoav" />)

    expect(
      await screen.findByText(
        'This browser does not support travel notifications.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('explains the iPhone Home Screen install step when not running standalone', async () => {
    mocked.detectPushReadiness.mockReturnValue('NEEDS_INSTALL')

    render(<TravelNotificationsCard travelerId="traveler-yoav" />)

    expect(
      await screen.findByText(
        'Add Travel Companion to your Home Screen first to use notifications.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('prompts for a traveler profile before allowing notifications to be turned on', async () => {
    mocked.detectPushReadiness.mockReturnValue('READY')
    mocked.getPushSubscriptionStatus.mockResolvedValue('INACTIVE')

    render(<TravelNotificationsCard travelerId={null} />)

    expect(
      await screen.findByText(
        'Choose a traveler profile above to turn on notifications.',
      ),
    ).toBeInTheDocument()
  })

  it('shows the browser-blocked state without a broken action button', async () => {
    mocked.detectPushReadiness.mockReturnValue('READY')
    mocked.getPushSubscriptionStatus.mockResolvedValue('INACTIVE')
    vi.stubGlobal(
      'Notification',
      Object.assign(vi.fn(), { permission: 'denied' }),
    )

    render(<TravelNotificationsCard travelerId="traveler-yoav" />)

    expect(
      await screen.findByText(/Notifications are blocked for this browser/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('never requests permission until the user clicks "Turn on travel notifications"', async () => {
    mocked.detectPushReadiness.mockReturnValue('READY')
    mocked.getPushSubscriptionStatus.mockResolvedValue('INACTIVE')
    mocked.subscribeToPushNotifications.mockResolvedValue({
      status: 'SUBSCRIBED',
    })

    render(<TravelNotificationsCard travelerId="traveler-yoav" />)
    await screen.findByRole('button', { name: 'Turn on travel notifications' })

    expect(mocked.subscribeToPushNotifications).not.toHaveBeenCalled()

    fireEvent.click(
      screen.getByRole('button', { name: 'Turn on travel notifications' }),
    )

    await waitFor(() =>
      expect(mocked.subscribeToPushNotifications).toHaveBeenCalledTimes(1),
    )
    expect(mocked.subscribeToPushNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        installationId: 'install-test-1',
        travelerId: 'traveler-yoav',
        vapidPublicKey: 'test-public-key',
      }),
    )
    expect(
      await screen.findByText('Travel notifications are on for this device.'),
    ).toBeInTheDocument()
  })

  it('works identically for Isabel', async () => {
    mocked.detectPushReadiness.mockReturnValue('READY')
    mocked.getPushSubscriptionStatus.mockResolvedValue('INACTIVE')
    mocked.subscribeToPushNotifications.mockResolvedValue({
      status: 'SUBSCRIBED',
    })

    render(<TravelNotificationsCard travelerId="traveler-isabel" />)
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Turn on travel notifications',
      }),
    )

    await waitFor(() =>
      expect(mocked.subscribeToPushNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ travelerId: 'traveler-isabel' }),
      ),
    )
  })

  it('sends a real test push through the server flow when already subscribed', async () => {
    mocked.detectPushReadiness.mockReturnValue('READY')
    mocked.getPushSubscriptionStatus.mockResolvedValue('ACTIVE')

    render(<TravelNotificationsCard travelerId="traveler-yoav" />)
    fireEvent.click(
      await screen.findByRole('button', { name: 'Send test notification' }),
    )

    await waitFor(() => expect(sendTestNotification).toHaveBeenCalledWith('install-test-1'))
    expect(
      await screen.findByText(
        'Test notification sent. It should arrive shortly.',
      ),
    ).toBeInTheDocument()
  })

  it('can turn notifications off again', async () => {
    mocked.detectPushReadiness.mockReturnValue('READY')
    mocked.getPushSubscriptionStatus.mockResolvedValue('ACTIVE')

    render(<TravelNotificationsCard travelerId="traveler-yoav" />)
    fireEvent.click(
      await screen.findByRole('button', { name: 'Turn off notifications' }),
    )

    await waitFor(() =>
      expect(mocked.unsubscribeFromPushNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ installationId: 'install-test-1' }),
      ),
    )
    expect(
      await screen.findByRole('button', { name: 'Turn on travel notifications' }),
    ).toBeInTheDocument()
  })
})
