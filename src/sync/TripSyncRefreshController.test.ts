import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TripSyncRefreshController } from './TripSyncRefreshController'

describe('TripSyncRefreshController', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
  })

  it('synchronizes when the document becomes visible', async () => {
    const synchronize = vi.fn(async () => {})
    const controller = new TripSyncRefreshController({ synchronize })
    controller.start()

    document.dispatchEvent(new Event('visibilitychange'))
    await vi.waitFor(() =>
      expect(synchronize).toHaveBeenCalledTimes(1),
    )

    controller.dispose()
  })

  it('synchronizes when connectivity returns', async () => {
    const synchronize = vi.fn(async () => {})
    const controller = new TripSyncRefreshController({ synchronize })
    controller.start()

    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() =>
      expect(synchronize).toHaveBeenCalledTimes(1),
    )

    controller.dispose()
  })

  it('does not throttle the online recovery trigger', async () => {
    const synchronize = vi.fn(async () => {})
    const controller = new TripSyncRefreshController({
      now: () => 10_000,
      synchronize,
      throttleMs: 5_000,
    })
    controller.start()

    window.dispatchEvent(new Event('focus'))
    await vi.waitFor(() =>
      expect(synchronize).toHaveBeenCalledTimes(1),
    )
    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() =>
      expect(synchronize).toHaveBeenCalledTimes(2),
    )

    controller.dispose()
  })

  it('deduplicates concurrent focus and visibility triggers', async () => {
    let finish: (() => void) | undefined
    const synchronize = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    const controller = new TripSyncRefreshController({ synchronize })
    controller.start()

    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('online'))
    expect(synchronize).toHaveBeenCalledTimes(1)

    finish?.()
    await Promise.resolve()
    controller.dispose()
  })

  it('releases a failed refresh so a later trigger can start again', async () => {
    let now = 10_000
    const synchronize = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce()
    const controller = new TripSyncRefreshController({
      now: () => now,
      synchronize,
      throttleMs: 5_000,
    })

    await expect(controller.requestRefresh()).rejects.toThrow(
      'network',
    )
    now += 5_000
    await expect(controller.requestRefresh()).resolves.toBeUndefined()

    expect(synchronize).toHaveBeenCalledTimes(2)
  })

  it('throttles repeated foreground triggers', async () => {
    let now = 10_000
    const synchronize = vi.fn(async () => {})
    const controller = new TripSyncRefreshController({
      now: () => now,
      synchronize,
      throttleMs: 5_000,
    })
    controller.start()

    window.dispatchEvent(new Event('focus'))
    await vi.waitFor(() =>
      expect(synchronize).toHaveBeenCalledTimes(1),
    )
    now += 4_999
    window.dispatchEvent(new Event('focus'))
    expect(synchronize).toHaveBeenCalledTimes(1)

    now += 1
    window.dispatchEvent(new Event('focus'))
    await vi.waitFor(() =>
      expect(synchronize).toHaveBeenCalledTimes(2),
    )
    controller.dispose()
  })
})
