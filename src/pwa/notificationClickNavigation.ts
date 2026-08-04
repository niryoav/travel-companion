/**
 * Deciding + performing "where should tapping a notification take the
 * user" — pulled out of the service worker's `notificationclick` listener
 * so it's testable without faking an entire ServiceWorkerGlobalScope.
 *
 * Three cases, matched to how the app is actually running:
 *  - no window open at all → open one at the target URL (works for both
 *    production and any Vercel Preview origin, since the caller always
 *    builds targetUrl from that request's own self.location.origin).
 *  - a window open somewhere else → navigate it in place, then focus it.
 *  - a window already at the target → just focus it, no navigate/reload,
 *    so a repeat tap never opens a duplicate window.
 */
export interface NotificationClickClient {
  readonly url: string
  focus(): Promise<unknown>
  navigate?(url: string): Promise<NotificationClickClient | null>
}

export async function handleNotificationClickNavigation(
  targetUrl: URL,
  matchClients: () => Promise<readonly NotificationClickClient[]>,
  openWindow: (url: string) => Promise<unknown>,
): Promise<void> {
  const clients = await matchClients()
  const existingClient = clients.find(
    (client) => new URL(client.url).origin === targetUrl.origin,
  )

  if (!existingClient) {
    await openWindow(targetUrl.href)
    return
  }

  const currentUrl = new URL(existingClient.url)
  const alreadyAtDestination =
    currentUrl.pathname === targetUrl.pathname &&
    currentUrl.hash === targetUrl.hash

  if (alreadyAtDestination) {
    await existingClient.focus()
    return
  }

  if (existingClient.navigate) {
    try {
      const navigated = await existingClient.navigate(targetUrl.href)
      if (navigated) {
        await navigated.focus()
        return
      }
    } catch {
      // Some browsers advertise navigate() but still fail at runtime (or a
      // client can close mid-navigation) — fall back to opening a window
      // below rather than leaving the user stranded on the wrong screen.
    }
  }

  await openWindow(targetUrl.href)
}
