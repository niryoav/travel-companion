import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { DocumentReference } from '../../domain/trip/tripTypes'
import { DocumentOfflineSync } from './DocumentOfflineSync'
import { documentOfflineService } from './documentOfflineService'
import { finalCruiseSummaryDocuments } from './finalCruiseSummary'

const documentReferences: DocumentReference[] = [
  {
    id: 'document-hotel',
    title: 'Hotel confirmation',
    category: 'HOTEL',
    assetPath: '/documents/travel/hotel.pdf',
    mimeType: 'application/pdf',
    associatedDate: '2026-08-22',
    dayId: 'day-2026-08-22',
    description: 'Hotel confirmation',
    actionLabel: 'Open hotel confirmation',
    offlineAvailable: true,
    verificationStatus: 'ISSUED',
  },
]

function fakeWindow() {
  const listeners: Record<string, (() => void)[]> = {}
  return {
    addEventListener: vi.fn((type: string, listener: () => void) => {
      listeners[type] ??= []
      listeners[type].push(listener)
    }),
    removeEventListener: vi.fn(),
    dispatchOnline: () => {
      for (const listener of listeners.online ?? []) {
        listener()
      }
    },
  }
}

describe('DocumentOfflineSync', () => {
  it('syncs every known document on mount (startup trigger)', async () => {
    const loadManifest = vi.fn(async () => [])
    const syncSpy = vi.spyOn(documentOfflineService, 'syncMissing')
      .mockResolvedValue()
    vi.spyOn(documentOfflineService, 'removeStale').mockResolvedValue()

    render(
      <DocumentOfflineSync
        documentReferences={documentReferences}
        loadManifest={loadManifest}
        windowTarget={fakeWindow() as unknown as Window}
      />,
    )

    await vi.waitFor(() => expect(syncSpy).toHaveBeenCalledTimes(1))
    const [hrefs] = syncSpy.mock.calls[0]
    expect(hrefs).toContain('/documents/travel/hotel.pdf')

    syncSpy.mockRestore()
  })

  it('includes any additional hrefs (e.g. voyage-progress images) in the same sync', async () => {
    const loadManifest = vi.fn(async () => [])
    const syncSpy = vi.spyOn(documentOfflineService, 'syncMissing')
      .mockResolvedValue()
    const removeStaleSpy = vi.spyOn(documentOfflineService, 'removeStale')
      .mockResolvedValue()

    render(
      <DocumentOfflineSync
        documentReferences={documentReferences}
        additionalHrefs={['/images/voyage-progress/voyage-day-01.png']}
        loadManifest={loadManifest}
        windowTarget={fakeWindow() as unknown as Window}
      />,
    )

    await vi.waitFor(() => expect(syncSpy).toHaveBeenCalledTimes(1))
    const [hrefs] = syncSpy.mock.calls[0]
    expect(hrefs).toContain('/documents/travel/hotel.pdf')
    expect(hrefs).toContain('/images/voyage-progress/voyage-day-01.png')

    const [staleHrefs] = removeStaleSpy.mock.calls[0]
    expect(staleHrefs).toContain('/images/voyage-progress/voyage-day-01.png')

    syncSpy.mockRestore()
    removeStaleSpy.mockRestore()
  })

  it('includes the Final Cruise Documents — Oceania documents in the same sync', async () => {
    const loadManifest = vi.fn(async () => [])
    const syncSpy = vi.spyOn(documentOfflineService, 'syncMissing')
      .mockResolvedValue()
    vi.spyOn(documentOfflineService, 'removeStale').mockResolvedValue()

    render(
      <DocumentOfflineSync
        documentReferences={documentReferences}
        loadManifest={loadManifest}
        windowTarget={fakeWindow() as unknown as Window}
      />,
    )

    await vi.waitFor(() => expect(syncSpy).toHaveBeenCalledTimes(1))
    const [hrefs] = syncSpy.mock.calls[0]
    expect(hrefs).toContain(finalCruiseSummaryDocuments[0].href)

    syncSpy.mockRestore()
  })

  it('retries missing documents again when the browser comes online', async () => {
    const loadManifest = vi.fn(async () => [])
    const syncSpy = vi.spyOn(documentOfflineService, 'syncMissing')
      .mockResolvedValue()
    vi.spyOn(documentOfflineService, 'removeStale').mockResolvedValue()
    const testWindow = fakeWindow()

    render(
      <DocumentOfflineSync
        documentReferences={documentReferences}
        loadManifest={loadManifest}
        windowTarget={testWindow as unknown as Window}
      />,
    )
    await vi.waitFor(() => expect(syncSpy).toHaveBeenCalledTimes(1))

    testWindow.dispatchOnline()
    await vi.waitFor(() => expect(syncSpy).toHaveBeenCalledTimes(2))

    syncSpy.mockRestore()
  })

  it('retries additional hrefs again when the browser comes online', async () => {
    const loadManifest = vi.fn(async () => [])
    const syncSpy = vi.spyOn(documentOfflineService, 'syncMissing')
      .mockResolvedValue()
    vi.spyOn(documentOfflineService, 'removeStale').mockResolvedValue()
    const testWindow = fakeWindow()

    render(
      <DocumentOfflineSync
        documentReferences={documentReferences}
        additionalHrefs={['/images/voyage-progress/voyage-day-01.png']}
        loadManifest={loadManifest}
        windowTarget={testWindow as unknown as Window}
      />,
    )
    await vi.waitFor(() => expect(syncSpy).toHaveBeenCalledTimes(1))

    testWindow.dispatchOnline()
    await vi.waitFor(() => expect(syncSpy).toHaveBeenCalledTimes(2))
    const [hrefs] = syncSpy.mock.calls[1]
    expect(hrefs).toContain('/images/voyage-progress/voyage-day-01.png')

    syncSpy.mockRestore()
  })
})
