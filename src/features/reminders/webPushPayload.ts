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

/**
 * A cold app launch normally redirects to whatever route the trip's
 * current phase implies (see selectStartupPath) — right for a manually
 * opened app, wrong for a notification that asked for a specific screen.
 * Reminder targetPaths that should survive that redirect carry this exact,
 * validated marker; StartupRouteGate checks for it explicitly rather than
 * preserving every arbitrary route or query string. Shared here so the
 * reminder/test-push payload builders and the app's startup routing agree
 * on the same param name and value.
 */
const NOTIFICATION_LAUNCH_PARAM = 'source'
const NOTIFICATION_LAUNCH_VALUE = 'notification'

export function withNotificationLaunchMarker(path: string): string {
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}${NOTIFICATION_LAUNCH_PARAM}=${NOTIFICATION_LAUNCH_VALUE}`
}

export function hasNotificationLaunchMarker(search: string): boolean {
  return (
    new URLSearchParams(search).get(NOTIFICATION_LAUNCH_PARAM) ===
    NOTIFICATION_LAUNCH_VALUE
  )
}

/** The query string with just the launch marker removed, keeping any other params intact. */
export function withoutNotificationLaunchMarker(search: string): string {
  const params = new URLSearchParams(search)
  params.delete(NOTIFICATION_LAUNCH_PARAM)
  const remaining = params.toString()
  return remaining ? `?${remaining}` : ''
}
