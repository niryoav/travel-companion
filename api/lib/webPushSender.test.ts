import webpush from 'web-push'
import { describe, expect, it, vi } from 'vitest'

import { sendWebPushNotification } from './webPushSender.js'

const validVapidKeys = webpush.generateVAPIDKeys()

const subscription = {
  endpoint: 'https://push.example/endpoint-1',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
}

const payload = {
  reminderId: 'test-notification',
  title: 'Travel Companion',
  body: 'Reismeldingen werken op dit toestel.',
  targetPath: '/more',
  tag: 'test-notification',
}

describe('sendWebPushNotification', () => {
  it('reports NOT_CONFIGURED without ever calling send when VAPID keys are missing', async () => {
    const sendNotification = vi.fn()
    const result = await sendWebPushNotification(
      subscription,
      payload,
      sendNotification,
    )
    expect(result).toEqual({ status: 'NOT_CONFIGURED' })
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('reports EXPIRED for a 410 Gone response', async () => {
    process.env.VAPID_PUBLIC_KEY = validVapidKeys.publicKey
    process.env.VAPID_PRIVATE_KEY = validVapidKeys.privateKey
    process.env.VAPID_SUBJECT = 'mailto:test@example.com'
    try {
      const sendNotification = vi.fn(async () => {
        throw Object.assign(new Error('Gone'), { statusCode: 410 })
      })
      const result = await sendWebPushNotification(
        subscription,
        payload,
        sendNotification,
      )
      expect(result).toEqual({ status: 'EXPIRED' })
    } finally {
      delete process.env.VAPID_PUBLIC_KEY
      delete process.env.VAPID_PRIVATE_KEY
      delete process.env.VAPID_SUBJECT
    }
  })

  it('reports FAILED for other send errors without throwing', async () => {
    process.env.VAPID_PUBLIC_KEY = validVapidKeys.publicKey
    process.env.VAPID_PRIVATE_KEY = validVapidKeys.privateKey
    process.env.VAPID_SUBJECT = 'mailto:test@example.com'
    try {
      const sendNotification = vi.fn(async () => {
        throw new Error('network blip')
      })
      const result = await sendWebPushNotification(
        subscription,
        payload,
        sendNotification,
      )
      expect(result).toEqual({ status: 'FAILED', error: 'network blip' })
    } finally {
      delete process.env.VAPID_PUBLIC_KEY
      delete process.env.VAPID_PRIVATE_KEY
      delete process.env.VAPID_SUBJECT
    }
  })

  it('sends the JSON-serialized payload on success', async () => {
    process.env.VAPID_PUBLIC_KEY = validVapidKeys.publicKey
    process.env.VAPID_PRIVATE_KEY = validVapidKeys.privateKey
    process.env.VAPID_SUBJECT = 'mailto:test@example.com'
    try {
      const sendNotification = vi.fn(async () => ({
        statusCode: 201,
        body: '',
        headers: {},
      }))
      const result = await sendWebPushNotification(
        subscription,
        payload,
        sendNotification,
      )
      expect(result).toEqual({ status: 'SENT' })
      expect(sendNotification).toHaveBeenCalledWith(
        { endpoint: subscription.endpoint, keys: subscription.keys },
        JSON.stringify(payload),
      )
    } finally {
      delete process.env.VAPID_PUBLIC_KEY
      delete process.env.VAPID_PRIVATE_KEY
      delete process.env.VAPID_SUBJECT
    }
  })
})
