import type {
  DayOperationalOverrideInput,
  EventOperationalOverrideInput,
  TripOverrideBundle,
} from '../domain/trip/tripOverrides'
import type {
  EventId,
  TravelerId,
  TripDayId,
  TripId,
} from '../domain/trip/tripTypes'
import { TripSnapshotApiError } from '../services/TripSnapshotApiClient'
import type { TripSnapshotApiClient } from '../services/TripSnapshotApiClient'
import type { LocalTripOverrideRepository } from '../storage/LocalTripOverrideRepository'
import type { TripOverrideRepository } from '../storage/TripOverrideRepository'
import type { TripSnapshotCache } from '../storage/TripSnapshotCache'
import type { TripSnapshot } from '../domain/trip/tripSnapshot'

const DEFAULT_RETRY_DELAY_MS = 15_000
const MAX_PAYLOADS_PER_SYNC_CYCLE = 3

interface RoleBasedSyncDependencies {
  apiClient: TripSnapshotApiClient
  cache: TripSnapshotCache
  getTravelerId(): TravelerId | null
  retryDelayMs?: number
  tripId: TripId
}

type SyncRole = 'editor' | 'follower' | null

function roleForTraveler(travelerId: TravelerId | null): SyncRole {
  if (travelerId === 'traveler-yoav') {
    return 'editor'
  }
  if (travelerId === 'traveler-isabel') {
    return 'follower'
  }
  return null
}

/**
 * Yoav's complete local override bundle is the working master. Isabel is a
 * read-only follower of the latest accepted server snapshot.
 */
export class SyncedTripOverrideRepository
implements TripOverrideRepository {
  private readonly listeners = new Set<() => void>()
  private readonly retryDelayMs: number
  private inFlight: Promise<void> | null = null
  private roleChangePending = false
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private snapshot: TripOverrideBundle

  constructor(
    private readonly localRepository: LocalTripOverrideRepository,
    initialSnapshot: TripOverrideBundle,
    private readonly dependencies?: RoleBasedSyncDependencies,
  ) {
    this.snapshot = initialSnapshot
    this.retryDelayMs =
      dependencies?.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS
    this.localRepository.subscribe(() => {
      this.snapshot = this.localRepository.getSnapshot()
      this.notify()
    })
  }

  getSnapshot = (): TripOverrideBundle => this.snapshot

  getSyncMetadata = () => this.localRepository.getMetadata()

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  saveDayEdits(
    dayId: TripDayId,
    dayOverride: DayOperationalOverrideInput | null,
    eventOverrides: Record<
      EventId,
      EventOperationalOverrideInput | null
    >,
  ): void {
    this.localRepository.saveDayEdits(
      dayId,
      dayOverride,
      eventOverrides,
    )
    void this.synchronizeForCurrentRole()
  }

  resetEvent(eventId: EventId): void {
    this.localRepository.resetEvent(eventId)
    void this.synchronizeForCurrentRole()
  }

  resetDay(dayId: TripDayId, eventIds: EventId[]): void {
    this.localRepository.resetDay(dayId, eventIds)
    void this.synchronizeForCurrentRole()
  }

  travelerChanged(): void {
    this.clearRetryTimer()
    if (this.inFlight) {
      this.roleChangePending = true
      return
    }
    void this.synchronizeForCurrentRole()
  }

  synchronizeForCurrentRole(): Promise<void> {
    if (!this.dependencies) {
      return Promise.resolve()
    }
    if (this.inFlight) {
      return this.inFlight
    }

    const role = roleForTraveler(
      this.dependencies.getTravelerId(),
    )
    if (!role) {
      return Promise.resolve()
    }

    this.clearRetryTimer()
    const operation =
      role === 'editor'
        ? this.pushEditorChanges()
        : this.refreshFollower()
    this.inFlight = operation.finally(() => {
      this.inFlight = null
      if (this.roleChangePending) {
        this.roleChangePending = false
        void this.synchronizeForCurrentRole()
      }
    })
    return this.inFlight
  }

  private async pushEditorChanges(): Promise<void> {
    if (
      !this.dependencies ||
      this.localRepository.getMetadata().syncState === 'synced'
    ) {
      return
    }

    for (
      let payloadIndex = 0;
      payloadIndex < MAX_PAYLOADS_PER_SYNC_CYCLE;
      payloadIndex += 1
    ) {
      const submittedSnapshot = this.snapshot
      try {
        const accepted = await this.putEditorSnapshot(
          submittedSnapshot,
        )
        const newerLocalPayloadExists =
          this.snapshot !== submittedSnapshot
        if (!newerLocalPayloadExists) {
          this.acceptSnapshot(accepted)
        } else {
          this.localRepository.markUnsyncedAtBaseRevision(
            accepted.revision,
          )
        }
        try {
          await this.dependencies.cache.saveAcceptedSnapshot(
            accepted,
          )
        } catch {
          // localStorage is Yoav's canonical persisted working copy.
        }

        if (!newerLocalPayloadExists) {
          return
        }
      } catch {
        this.localRepository.markSyncState('unsynced')
        this.scheduleRetry()
        return
      }
    }

    if (this.localRepository.getMetadata().syncState !== 'synced') {
      this.scheduleRetry()
    }
  }

  private async putEditorSnapshot(
    operationalOverrides: TripOverrideBundle,
  ): Promise<TripSnapshot> {
    if (!this.dependencies) {
      throw new Error('Shared trip sync is unavailable')
    }

    let baseRevision =
      this.localRepository.getMetadata().baseRevision
    let baseEtag: string | undefined
    if (baseRevision === null) {
      const observed =
        await this.dependencies.apiClient.getTripSnapshot(
          this.dependencies.tripId,
        )
      baseRevision = observed?.snapshot.revision ?? 0
      baseEtag = observed?.etag
    }

    try {
      return await this.dependencies.apiClient.putTripSnapshot(
        this.dependencies.tripId,
        baseRevision,
        operationalOverrides,
        baseEtag,
      )
    } catch (error) {
      if (
        !(
          error instanceof TripSnapshotApiError &&
          error.code === 'REVISION_CONFLICT'
        )
      ) {
        throw error
      }

      const latest =
        await this.dependencies.apiClient.getTripSnapshot(
          this.dependencies.tripId,
        )
      const retryBaseRevision =
        latest?.snapshot.revision ?? error.currentRevision ?? 0
      return this.dependencies.apiClient.putTripSnapshot(
        this.dependencies.tripId,
        retryBaseRevision,
        operationalOverrides,
        latest?.etag,
      )
    }
  }

  private async refreshFollower(): Promise<void> {
    if (!this.dependencies) {
      return
    }
    try {
      const remote =
        await this.dependencies.apiClient.getTripSnapshot(
          this.dependencies.tripId,
        )
      if (!remote) {
        return
      }
      const { snapshot } = remote

      const metadata = this.localRepository.getMetadata()
      if (
        metadata.syncState === 'synced' &&
        metadata.baseRevision !== null &&
        snapshot.revision < metadata.baseRevision
      ) {
        return
      }
      if (
        metadata.syncState === 'synced' &&
        snapshot.revision === metadata.baseRevision &&
        metadata.lastSuccessfulSyncAt
      ) {
        return
      }

      this.acceptSnapshot(snapshot)
      try {
        await this.dependencies.cache.saveAcceptedSnapshot(snapshot)
      } catch {
        // The accepted follower snapshot is already safe in localStorage.
      }
    } catch {
      // Isabel continues with the last accepted cached snapshot.
    }
  }

  private acceptSnapshot(snapshot: TripSnapshot): void {
    this.localRepository.acceptSyncedSnapshot(snapshot)
  }

  private scheduleRetry(): void {
    if (
      !this.dependencies ||
      this.retryTimer ||
      roleForTraveler(this.dependencies.getTravelerId()) !== 'editor'
    ) {
      return
    }
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      void this.synchronizeForCurrentRole()
    }, this.retryDelayMs)
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}
