import { describe, expect, it, vi } from 'vitest'

import { PwaUpdateManager } from './PwaUpdateManager'

function registration(update = vi.fn().mockResolvedValue(undefined)) {
  return {
    registration: { update } as unknown as ServiceWorkerRegistration,
    update,
  }
}

describe('PwaUpdateManager', () => {
  it('stays harmless when service workers are unavailable', async () => {
    const manager = new PwaUpdateManager(false)

    expect(manager.getSnapshot()).toEqual({
      updateStatus: 'UNAVAILABLE',
      offlineStatus: 'UNAVAILABLE',
      supported: false,
    })
    await manager.applyUpdate()
    expect(manager.getSnapshot().updateStatus).toBe('UNAVAILABLE')
  })

  it('moves from checking to current and records offline readiness', () => {
    const manager = new PwaUpdateManager(true)
    const { registration: serviceWorkerRegistration } = registration()

    manager.registered(serviceWorkerRegistration, true)

    expect(manager.getSnapshot()).toEqual({
      updateStatus: 'CURRENT',
      offlineStatus: 'READY',
      supported: true,
    })
  })

  it('notifies only once for a repeated waiting-worker signal', () => {
    const manager = new PwaUpdateManager(true)
    const listener = vi.fn()
    manager.subscribe(listener)

    manager.updateAvailable()
    manager.updateAvailable()

    expect(manager.getSnapshot().updateStatus).toBe('UPDATE_AVAILABLE')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('applies an accepted update once and requests the safe reload flow', async () => {
    const manager = new PwaUpdateManager(true)
    const applyUpdate = vi.fn().mockResolvedValue(undefined)
    manager.attachApplyUpdate(applyUpdate)
    manager.updateAvailable()

    await manager.applyUpdate()
    await manager.applyUpdate()

    expect(applyUpdate).toHaveBeenCalledTimes(1)
    expect(applyUpdate).toHaveBeenCalledWith(true)
    expect(manager.getSnapshot().updateStatus).toBe('APPLYING')
  })

  it('handles registration and update-application failure without throwing', async () => {
    const manager = new PwaUpdateManager(true)
    manager.registered(undefined, false)
    expect(manager.getSnapshot().updateStatus).toBe('FAILED')

    manager.attachApplyUpdate(vi.fn().mockRejectedValue(new Error('offline')))
    manager.updateAvailable()
    await manager.applyUpdate()

    expect(manager.getSnapshot().updateStatus).toBe('FAILED')
  })

  it('checks the current registration and returns to current when no update waits', async () => {
    const manager = new PwaUpdateManager(true)
    const { registration: serviceWorkerRegistration, update } = registration()
    manager.registered(serviceWorkerRegistration, false)

    await manager.checkForUpdate()

    expect(update).toHaveBeenCalledTimes(1)
    expect(manager.getSnapshot().updateStatus).toBe('CURRENT')
  })

  it('keeps the app usable when an update check rejects', async () => {
    const manager = new PwaUpdateManager(true)
    const { registration: serviceWorkerRegistration } = registration(
      vi.fn().mockRejectedValue(new Error('offline')),
    )
    manager.registered(serviceWorkerRegistration, true)

    await manager.checkForUpdate()

    expect(manager.getSnapshot()).toMatchObject({
      updateStatus: 'FAILED',
      offlineStatus: 'READY',
    })
  })
})
