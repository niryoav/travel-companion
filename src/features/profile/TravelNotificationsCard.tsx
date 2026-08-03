import { useEffect, useState } from 'react'

import { SurfaceCard } from '../../components/SurfaceCard'
import type { TravelerId } from '../../domain/trip/tripTypes'
import {
  detectPushReadiness,
  getOrCreatePushInstallationId,
  getPushSubscriptionStatus,
  HttpPushSubscriptionApi,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  type PushReadiness,
} from '../reminders/pushNotificationClient'

interface TravelNotificationsCardProps {
  travelerId: TravelerId | null
}

type SubscriptionState = 'CHECKING' | 'NOT_SUBSCRIBED' | 'SUBSCRIBED'

type ActionMessage = { tone: 'success' | 'error'; text: string }

const api = new HttpPushSubscriptionApi()

export function TravelNotificationsCard({
  travelerId,
}: TravelNotificationsCardProps) {
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as
    | string
    | undefined
  const [readiness] = useState<PushReadiness>(() => detectPushReadiness())
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification === 'undefined' ? 'default' : Notification.permission,
  )
  const [subscription, setSubscription] =
    useState<SubscriptionState>('CHECKING')
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState<ActionMessage | null>(null)
  const [installationId] = useState(() =>
    getOrCreatePushInstallationId(window.localStorage),
  )

  useEffect(() => {
    if (readiness !== 'READY') {
      return
    }
    void getPushSubscriptionStatus().then((status) => {
      setSubscription(status === 'ACTIVE' ? 'SUBSCRIBED' : 'NOT_SUBSCRIBED')
    })
  }, [readiness])

  const handleEnable = async () => {
    if (!travelerId || !vapidPublicKey) {
      return
    }
    setWorking(true)
    setMessage(null)
    const result = await subscribeToPushNotifications({
      installationId,
      travelerId,
      vapidPublicKey,
      api,
    })
    setWorking(false)
    setPermission(Notification.permission)
    if (result.status === 'SUBSCRIBED') {
      setSubscription('SUBSCRIBED')
    } else if (result.status === 'FAILED') {
      setMessage({ tone: 'error', text: `Could not turn on notifications: ${result.error}` })
    }
  }

  const handleDisable = async () => {
    setWorking(true)
    setMessage(null)
    try {
      await unsubscribeFromPushNotifications({ installationId, api })
      setSubscription('NOT_SUBSCRIBED')
    } catch {
      setMessage({
        tone: 'error',
        text: 'Could not turn off notifications. Please try again.',
      })
    } finally {
      setWorking(false)
    }
  }

  const handleTest = async () => {
    setWorking(true)
    setMessage(null)
    try {
      await api.sendTestNotification(installationId)
      setMessage({
        tone: 'success',
        text: 'Test notification sent. It should arrive shortly.',
      })
    } catch {
      setMessage({
        tone: 'error',
        text: 'The test notification could not be sent.',
      })
    } finally {
      setWorking(false)
    }
  }

  return (
    <SurfaceCard className="travel-notifications-card">
      <p className="card-eyebrow">Travel notifications</p>
      <p>
        Get a reminder on this device before transfers, check-in, embarkation
        and excursions — even when Travel Companion is closed.
      </p>

      {readiness === 'UNSUPPORTED' ? (
        <p role="status">
          This browser does not support travel notifications.
        </p>
      ) : readiness === 'NEEDS_INSTALL' ? (
        <p role="status">
          Add Travel Companion to your Home Screen first to use
          notifications.
        </p>
      ) : !vapidPublicKey ? (
        <p role="status">Travel notifications are not configured yet.</p>
      ) : !travelerId ? (
        <p role="status">
          Choose a traveler profile above to turn on notifications.
        </p>
      ) : (
        <>
          {permission === 'denied' ? (
            <p role="status">
              Notifications are blocked for this browser. Allow notifications
              in your device settings to turn them on.
            </p>
          ) : subscription === 'SUBSCRIBED' ? (
            <>
              <p role="status">Travel notifications are on for this device.</p>
              <button type="button" disabled={working} onClick={handleTest}>
                Send test notification
              </button>
              <button type="button" disabled={working} onClick={handleDisable}>
                Turn off notifications
              </button>
            </>
          ) : (
            <button type="button" disabled={working} onClick={handleEnable}>
              Turn on travel notifications
            </button>
          )}
        </>
      )}

      {message ? (
        <p
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`travel-notifications-message travel-notifications-message-${message.tone}`}
        >
          {message.text}
        </p>
      ) : null}
    </SurfaceCard>
  )
}
