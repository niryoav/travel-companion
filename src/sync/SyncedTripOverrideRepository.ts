import type {
  DayOperationalOverrideInput,
  EventOperationalOverrideInput,
  TripOverrideBundle,
} from '../domain/trip/tripOverrides'
import type { EventId, TripDayId } from '../domain/trip/tripTypes'
import type { LocalTripOverrideRepository } from '../storage/LocalTripOverrideRepository'
import type { TripOverrideRepository } from '../storage/TripOverrideRepository'
import type { TripOverrideSaveResult } from '../storage/TripOverrideRepository'
import type { TripSnapshot } from '../domain/trip/tripSnapshot'
import type { TripId } from '../domain/trip/tripTypes'
import type { TripSnapshotCache } from '../storage/TripSnapshotCache'
import type { TripSnapshotApiClient } from '../services/TripSnapshotApiClient'
import { TripSnapshotApiError } from '../services/TripSnapshotApiClient'

/**
 * Local editing remains immediately available. Every save makes one bounded
 * sharing attempt: a known base goes directly to PUT, while an unknown base
 * is observed with one GET before PUT. Failures remain local and are retried
 * only through an explicit user action.
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

  getSyncMetadata = () => this.localRepository.getMetadata()

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

  acceptNoRemoteSnapshot(): boolean {
    if (this.protectsLocalChanges) {
      return false
    }
    this.applyingAcceptedRemote = true
    try {
      this.localRepository.replaceSnapshotForRead(this.snapshot, {
        baseRevision: 0,
        lastModified: this.localRepository.getMetadata().lastModified,
        syncState: 'synced',
      })
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
  ): Promise<TripOverrideSaveResult> {
    this.localRepository.saveDayEdits(
      dayId,
      dayOverride,
      eventOverrides,
    )
    return this.attemptImmediateWrite()
  }

  resetEvent(eventId: EventId): Promise<TripOverrideSaveResult> {
    this.localRepository.resetEvent(eventId)
    return this.attemptImmediateWrite()
  }

  resetDay(
    dayId: TripDayId,
    eventIds: EventId[],
  ): Promise<TripOverrideSaveResult> {
    this.localRepository.resetDay(dayId, eventIds)
    return this.attemptImmediateWrite()
  }

  retryShare(): Promise<TripOverrideSaveResult> {
    return this.attemptImmediateWrite()
  }

  private async attemptImmediateWrite(): Promise<TripOverrideSaveResult> {
    if (!this.writeDependencies || this.writeInFlight) {
      return 'local-only'
    }
    const metadata = this.localRepository.getMetadata()

    this.writeInFlight = true
    const submittedSnapshot = this.snapshot
    try {
      let baseRevision = metadata.baseRevision
      if (baseRevision === null) {
        const remote =
          await this.writeDependencies.apiClient.getTripSnapshot(
            this.writeDependencies.tripId,
          )
        baseRevision = remote?.revision ?? 0
        if (remote) {
          try {
            await this.writeDependencies.cache.saveAcceptedSnapshot(remote)
          } catch {
            // The observed revision is still valid for this one write attempt.
          }
        }
      }
      const accepted =
        await this.writeDependencies.apiClient.putTripSnapshot(
          this.writeDependencies.tripId,
          baseRevision,
          submittedSnapshot,
        )
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
      try {
        await this.writeDependencies.cache.saveAcceptedSnapshot(accepted)
      } catch {
        // The authoritative write succeeded; localStorage remains the fallback.
      }
      return 'shared'
    } catch (error) {
      if (
        error instanceof TripSnapshotApiError &&
        error.code === 'REVISION_CONFLICT'
      ) {
        this.localRepository.markSyncState('conflict')
        return 'conflict'
      } else {
        this.localRepository.markSyncState('unsynced')
        return 'local-only'
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
