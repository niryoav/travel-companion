import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { tripFixture } from '../../test/fixtures/tripFixture'
import { TravelNotificationsCard } from './TravelNotificationsCard'
import * as pushNotificationClient from '../reminders/pushNotificationClient'

// Within tripFixture's trip window (2030-05-10 to 2030-05-14); the specific
// phase doesn't matter for these tests, none of which assert phase copy.
const FIXED_NOW = new Date('2030-05-11T12:00:00Z')

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

    render(<TravelNotificationsCard now={FIXED_NOW} tripData={tripFixture} travelerId="traveler-yoav" />)

    expect(
      await screen.findByText(
        'This browser does not support travel notifications.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('explains the iPhone Home Screen install step when not running standalone', async () => {
    mocked.detectPushReadiness.mockReturnValue('NEEDS_INSTALL')

    render(<TravelNotificationsCard now={FIXED_NOW} tripData={tripFixture} travelerId="traveler-yoav" />)

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

    render(<TravelNotificationsCard now={FIXED_NOW} tripData={tripFixture} travelerId={null} />)

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

    render(<TravelNotificationsCard now={FIXED_NOW} tripData={tripFixture} travelerId="traveler-yoav" />)

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

    render(<TravelNotificationsCard now={FIXED_NOW} tripData={tripFixture} travelerId="traveler-yoav" />)
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
      await screen.findByText(/Notifications enabled\./),
    ).toBeInTheDocument()
  })

  it('works identically for Isabel', async () => {
    mocked.detectPushReadiness.mockReturnValue('READY')
    mocked.getPushSubscriptionStatus.mockResolvedValue('INACTIVE')
    mocked.subscribeToPushNotifications.mockResolvedValue({
      status: 'SUBSCRIBED',
    })

    render(<TravelNotificationsCard now={FIXED_NOW} tripData={tripFixture} travelerId="traveler-isabel" />)
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

    render(<TravelNotificationsCard now={FIXED_NOW} tripData={tripFixture} travelerId="traveler-yoav" />)
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

    render(<TravelNotificationsCard now={FIXED_NOW} tripData={tripFixture} travelerId="traveler-yoav" />)
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

describe('TravelNotificationsCard — phase copy', () => {
  it('mentions the daily test before the trip', async () => {
    mocked.detectPushReadiness.mockReturnValue('READY')
    mocked.getPushSubscriptionStatus.mockResolvedValue('ACTIVE')

    render(
      <TravelNotificationsCard
        now={new Date('2030-05-01T00:00:00Z')}
        tripData={tripFixture}
        travelerId="traveler-yoav"
      />,
    )

    expect(
      await screen.findByText('Notifications enabled. Daily test active before the trip.'),
    ).toBeInTheDocument()
  })

  it('mentions real travel reminders during the trip', async () => {
    mocked.detectPushReadiness.mockReturnValue('READY')
    mocked.getPushSubscriptionStatus.mockResolvedValue('ACTIVE')

    render(
      <TravelNotificationsCard
        now={new Date('2030-05-11T12:00:00Z')}
        tripData={tripFixture}
        travelerId="traveler-yoav"
      />,
    )

    expect(
      await screen.findByText(
        'Notifications enabled. Real travel reminders active during the trip.',
      ),
    ).toBeInTheDocument()
  })

  it('mentions only that notifications are enabled after the trip has ended', async () => {
    mocked.detectPushReadiness.mockReturnValue('READY')
    mocked.getPushSubscriptionStatus.mockResolvedValue('ACTIVE')

    render(
      <TravelNotificationsCard
        now={new Date('2030-06-01T00:00:00Z')}
        tripData={tripFixture}
        travelerId="traveler-yoav"
      />,
    )

    expect(await screen.findByText('Notifications enabled.')).toBeInTheDocument()
  })
})
