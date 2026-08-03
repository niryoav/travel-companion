/**
 * The Web Push message body, shared between the server (constructing and
 * sending it) and the service worker (receiving it and calling
 * `showNotification`) — kept dependency-free so the service worker never
 * pulls in server-only code (VAPID signing, Node crypto).
 */
export interface WebPushNotificationPayload {
  reminderId: string
  title: string
  body: string
  targetPath: string
  tag: string
}
