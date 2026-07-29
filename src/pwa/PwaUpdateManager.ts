export type PwaUpdateStatus =
  | 'CHECKING'
  | 'CURRENT'
  | 'UPDATE_AVAILABLE'
  | 'APPLYING'
  | 'FAILED'
  | 'UNAVAILABLE'

export type PwaOfflineStatus = 'CHECKING' | 'READY' | 'UNAVAILABLE'

export interface PwaStatus {
  updateStatus: PwaUpdateStatus
  offlineStatus: PwaOfflineStatus
  supported: boolean
}

type ApplyUpdate = (reloadPage?: boolean) => Promise<void>
type Listener = () => void

export class PwaUpdateManager {
  private applyUpdateHandler?: ApplyUpdate
  private registration?: ServiceWorkerRegistration
  private readonly listeners = new Set<Listener>()
  private snapshot: PwaStatus
  private reloadStarted = false

  constructor(
    supported: boolean,
    private readonly reloadPage: () => void = () =>
      window.location.reload(),
  ) {
    this.snapshot = supported
      ? {
          updateStatus: 'CHECKING',
          offlineStatus: 'CHECKING',
          supported: true,
        }
      : {
          updateStatus: 'UNAVAILABLE',
          offlineStatus: 'UNAVAILABLE',
          supported: false,
        }
  }

  getSnapshot = (): PwaStatus => this.snapshot

  canCheckForUpdate = (): boolean =>
    this.snapshot.supported && Boolean(this.registration)

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  attachApplyUpdate(handler: ApplyUpdate): void {
    this.applyUpdateHandler = handler
  }

  registered(
    registration: ServiceWorkerRegistration | undefined,
    hasActiveController: boolean,
  ): void {
    if (!registration) {
      this.registrationFailed()
      return
    }
    this.registration = registration
    this.update((current) => ({
      ...current,
      updateStatus:
        current.updateStatus === 'CHECKING'
          ? 'CURRENT'
          : current.updateStatus,
      offlineStatus: hasActiveController ? 'READY' : current.offlineStatus,
    }))
  }

  offlineReady(): void {
    this.update((current) => ({
      ...current,
      offlineStatus: 'READY',
    }))
  }

  updateAvailable(): void {
    if (this.snapshot.updateStatus === 'APPLYING') {
      return
    }
    this.update((current) => ({
      ...current,
      updateStatus: 'UPDATE_AVAILABLE',
    }))
  }

  reloadAfterUpdate(): void {
    if (this.reloadStarted) {
      return
    }
    this.reloadStarted = true
    this.update((current) => ({
      ...current,
      updateStatus: 'CURRENT',
    }))
    this.reloadPage()
  }

  registrationFailed(): void {
    this.update((current) => ({
      ...current,
      updateStatus: 'FAILED',
      offlineStatus:
        current.offlineStatus === 'READY' ? 'READY' : 'UNAVAILABLE',
    }))
  }

  async checkForUpdate(): Promise<void> {
    if (!this.snapshot.supported || !this.registration) {
      this.registrationFailed()
      return
    }
    if (
      this.snapshot.updateStatus === 'UPDATE_AVAILABLE' ||
      this.snapshot.updateStatus === 'APPLYING'
    ) {
      return
    }

    this.update((current) => ({
      ...current,
      updateStatus: 'CHECKING',
    }))

    try {
      await this.registration.update()
      if (this.snapshot.updateStatus === 'CHECKING') {
        this.update((current) => ({
          ...current,
          updateStatus: 'CURRENT',
        }))
      }
    } catch {
      this.registrationFailed()
    }
  }

  async applyUpdate(): Promise<void> {
    if (
      this.snapshot.updateStatus !== 'UPDATE_AVAILABLE' ||
      !this.applyUpdateHandler
    ) {
      return
    }

    this.update((current) => ({
      ...current,
      updateStatus: 'APPLYING',
    }))

    try {
      await this.applyUpdateHandler(true)
    } catch {
      this.update((current) => ({
        ...current,
        updateStatus: 'FAILED',
      }))
    }
  }

  private update(updateSnapshot: (current: PwaStatus) => PwaStatus): void {
    const next = updateSnapshot(this.snapshot)
    if (
      next.updateStatus === this.snapshot.updateStatus &&
      next.offlineStatus === this.snapshot.offlineStatus &&
      next.supported === this.snapshot.supported
    ) {
      return
    }

    this.snapshot = next
    this.listeners.forEach((listener) => listener())
  }
}

export const unavailablePwaUpdateManager = new PwaUpdateManager(false)
