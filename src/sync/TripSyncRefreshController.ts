const DEFAULT_REFRESH_THROTTLE_MS = 5_000

interface TripSyncRefreshControllerOptions {
  documentTarget?: Document
  now?: () => number
  synchronize(): Promise<void>
  throttleMs?: number
  windowTarget?: Window
}

export class TripSyncRefreshController {
  private readonly documentTarget: Document
  private readonly now: () => number
  private readonly throttleMs: number
  private readonly windowTarget: Window
  private inFlight: Promise<void> | null = null
  private lastRefreshStartedAt = Number.NEGATIVE_INFINITY
  private started = false

  constructor(
    private readonly options: TripSyncRefreshControllerOptions,
  ) {
    this.documentTarget = options.documentTarget ?? document
    this.windowTarget = options.windowTarget ?? window
    this.now = options.now ?? (() => Date.now())
    this.throttleMs =
      options.throttleMs ?? DEFAULT_REFRESH_THROTTLE_MS
  }

  start(): void {
    if (this.started) {
      return
    }
    this.started = true
    this.windowTarget.addEventListener('focus', this.handleFocus)
    this.documentTarget.addEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    )
    this.windowTarget.addEventListener('online', this.handleOnline)
  }

  dispose(): void {
    if (!this.started) {
      return
    }
    this.started = false
    this.windowTarget.removeEventListener('focus', this.handleFocus)
    this.documentTarget.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    )
    this.windowTarget.removeEventListener('online', this.handleOnline)
  }

  requestRefresh(): Promise<void> {
    if (
      this.documentTarget.visibilityState === 'hidden'
    ) {
      return Promise.resolve()
    }
    if (this.inFlight) {
      return this.inFlight
    }
    const startedAt = this.now()
    if (
      startedAt - this.lastRefreshStartedAt <
      this.throttleMs
    ) {
      return Promise.resolve()
    }

    this.lastRefreshStartedAt = startedAt
    this.inFlight = this.options.synchronize().finally(() => {
      this.inFlight = null
    })
    return this.inFlight
  }

  private readonly handleFocus = () => {
    void this.requestRefresh()
  }

  private readonly handleVisibilityChange = () => {
    if (this.documentTarget.visibilityState === 'visible') {
      void this.requestRefresh()
    }
  }

  private readonly handleOnline = () => {
    this.lastRefreshStartedAt = Number.NEGATIVE_INFINITY
    void this.requestRefresh()
  }
}
