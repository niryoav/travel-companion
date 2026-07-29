import type {
  DayOperationalOverrideInput,
  EventOperationalOverrideInput,
  TripOverrideBundle,
} from '../domain/trip/tripOverrides'
import type { EventId, TripDayId } from '../domain/trip/tripTypes'
import type { LocalTripOverrideRepository } from '../storage/LocalTripOverrideRepository'
import type { TripOverrideRepository } from '../storage/TripOverrideRepository'
import type { TripSnapshot } from '../domain/trip/tripSnapshot'
import type { TripId } from '../domain/trip/tripTypes'
import type { TripSnapshotCache } from '../storage/TripSnapshotCache'
import type { TripSnapshotApiClient } from '../services/TripSnapshotApiClient'
import { TripSnapshotApiError } from '../services/TripSnapshotApiClient'
import type { EditorCredentialRepository } from '../storage/EditorCredentialRepository'

/**
 * Local editing remains immediately available. When a known base revision and
 * editor credential exist, one immediate PUT is attempted. Failures are
 * recorded locally and are never retried or merged by this increment.
 */
export class SyncedTripOverrideRepository
implements TripOverrideRepository {
  private readonly listeners = new Set<() => void>()
  private snapshot: TripOverrideBundle
  private protectsLocalChanges: boolean
  private applyingAcceptedRemote = false
  private writeInFlight = false

  constructor(
    private readonly localRepository: LocalTripOverrideRepository,
    initialSnapshot: TripOverrideBundle,
    protectsLocalChanges: boolean,
    private readonly writeDependencies?: {
      tripId: TripId
      cache: TripSnapshotCache
      apiClient: TripSnapshotApiClient
      credentialRepository: EditorCredentialRepository
    },
  ) {
    this.snapshot = initialSnapshot
    this.protectsLocalChanges = protectsLocalChanges
    this.localRepository.subscribe(() => {
      this.snapshot = this.localRepository.getSnapshot()
      if (!this.applyingAcceptedRemote) {
        this.protectsLocalChanges = true
      }
      this.notify()
    })
  }

  getSnapshot = (): TripOverrideBundle => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  acceptRemoteSnapshot(snapshot: TripSnapshot): boolean {
    if (this.protectsLocalChanges) {
      return false
    }
    this.applyingAcceptedRemote = true
    try {
      this.localRepository.replaceSnapshotForRead(
        snapshot.operationalOverrides,
        {
          baseRevision: snapshot.revision,
          lastModified: snapshot.updatedAt,
          syncState: 'synced',
        },
      )
    } finally {
      this.applyingAcceptedRemote = false
    }
    return true
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
    void this.attemptImmediateWrite()
  }

  resetEvent(eventId: EventId): void {
    this.localRepository.resetEvent(eventId)
    void this.attemptImmediateWrite()
  }

  resetDay(dayId: TripDayId, eventIds: EventId[]): void {
    this.localRepository.resetDay(dayId, eventIds)
    void this.attemptImmediateWrite()
  }

  private async attemptImmediateWrite(): Promise<void> {
    if (!this.writeDependencies || this.writeInFlight) {
      return
    }
    const editorToken =
      this.writeDependencies.credentialRepository.loadToken()
    const metadata = this.localRepository.getMetadata()
    if (!editorToken || metadata.baseRevision === null) {
      return
    }

    this.writeInFlight = true
    const submittedSnapshot = this.snapshot
    try {
      const accepted =
        await this.writeDependencies.apiClient.putTripSnapshot(
          this.writeDependencies.tripId,
          metadata.baseRevision,
          submittedSnapshot,
          editorToken,
        )
      try {
        await this.writeDependencies.cache.saveAcceptedSnapshot(accepted)
      } catch {
        this.localRepository.markUnsyncedAtBaseRevision(
          accepted.revision,
        )
        return
      }
      if (this.snapshot === submittedSnapshot) {
        this.applyingAcceptedRemote = true
        try {
          this.localRepository.acceptSyncedSnapshot(accepted)
          this.protectsLocalChanges = false
        } finally {
          this.applyingAcceptedRemote = false
        }
      } else {
        this.localRepository.markUnsyncedAtBaseRevision(
          accepted.revision,
        )
      }
    } catch (error) {
      if (
        error instanceof TripSnapshotApiError &&
        error.code === 'REVISION_CONFLICT'
      ) {
        this.localRepository.markSyncState('conflict')
      } else {
        this.localRepository.markSyncState('unsynced')
      }
    } finally {
      this.writeInFlight = false
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}
