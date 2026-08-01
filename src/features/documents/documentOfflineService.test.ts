import { describe, expect, it, vi } from 'vitest'

import { DocumentOfflineService } from './documentOfflineService'

class FakeCache {
  private readonly entries = new Map<string, Response>()

  async match(request: string): Promise<Response | undefined> {
    return this.entries.get(request)
  }

  async put(request: string, response: Response): Promise<void> {
    this.entries.set(request, response)
  }

  async delete(request: Request | string): Promise<boolean> {
    const url = typeof request === 'string' ? request : request.url
    return this.entries.delete(url)
  }

  async keys(): Promise<Request[]> {
    return [...this.entries.keys()].map((url) => new Request(url))
  }
}

class FakeCacheStorage {
  readonly cache = new FakeCache()

  async open(): Promise<FakeCache> {
    return this.cache
  }
}

function okResponse(body = 'pdf-bytes'): Response {
  return new Response(body, { status: 200 })
}

describe('DocumentOfflineService', () => {
  it('starts every document as not-cached', () => {
    const service = new DocumentOfflineService({
      cacheStorage: new FakeCacheStorage() as unknown as CacheStorage,
      fetchImpl: vi.fn(),
    })
    expect(service.getStatus('/documents/a.pdf')).toBe('not-cached')
  })

  it('downloads a missing document and marks it cached', async () => {
    const fetchImpl = vi.fn(async () => okResponse())
    const service = new DocumentOfflineService({
      cacheStorage: new FakeCacheStorage() as unknown as CacheStorage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    await service.ensureCached('/documents/a.pdf')

    expect(service.getStatus('/documents/a.pdf')).toBe('cached')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('does not redownload a document already in the cache', async () => {
    const cacheStorage = new FakeCacheStorage()
    await cacheStorage.cache.put('/documents/a.pdf', okResponse())
    const fetchImpl = vi.fn(async () => okResponse())
    const service = new DocumentOfflineService({
      cacheStorage: cacheStorage as unknown as CacheStorage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    await service.ensureCached('/documents/a.pdf')

    expect(service.getStatus('/documents/a.pdf')).toBe('cached')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('does not restart a download already in progress', async () => {
    const fetchImpl = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
      return okResponse()
    })
    const service = new DocumentOfflineService({
      cacheStorage: new FakeCacheStorage() as unknown as CacheStorage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    const first = service.ensureCached('/documents/a.pdf')
    const second = service.ensureCached('/documents/a.pdf')
    await Promise.all([first, second])

    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('marks a failed download as failed without throwing, and it stays retryable', async () => {
    const fetchImpl = vi.fn(async (): Promise<Response> => {
      throw new Error('network down')
    })
    const service = new DocumentOfflineService({
      cacheStorage: new FakeCacheStorage() as unknown as CacheStorage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    await service.ensureCached('/documents/a.pdf')
    expect(service.getStatus('/documents/a.pdf')).toBe('failed')

    fetchImpl.mockImplementationOnce(async () => okResponse())
    await service.ensureCached('/documents/a.pdf')
    expect(service.getStatus('/documents/a.pdf')).toBe('cached')
  })

  it('notifies subscribers when status changes', async () => {
    const fetchImpl = vi.fn(async () => okResponse())
    const service = new DocumentOfflineService({
      cacheStorage: new FakeCacheStorage() as unknown as CacheStorage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    const listener = vi.fn()
    service.subscribe(listener)

    await service.ensureCached('/documents/a.pdf')

    expect(listener).toHaveBeenCalled()
  })

  it('limits concurrency while syncing a batch of missing documents', async () => {
    let active = 0
    let maxActive = 0
    const fetchImpl = vi.fn(async () => {
      active += 1
      maxActive = Math.max(maxActive, active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      active -= 1
      return okResponse()
    })
    const service = new DocumentOfflineService({
      cacheStorage: new FakeCacheStorage() as unknown as CacheStorage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      concurrency: 2,
    })

    await service.syncMissing([
      '/documents/a.pdf',
      '/documents/b.pdf',
      '/documents/c.pdf',
      '/documents/d.pdf',
    ])

    expect(maxActive).toBeLessThanOrEqual(2)
    expect(fetchImpl).toHaveBeenCalledTimes(4)
  })

  it('does not let one failed download stop the rest of the batch', async () => {
    const fetchImpl = vi.fn(async (input: string) => {
      if (input === '/documents/broken.pdf') {
        throw new Error('boom')
      }
      return okResponse()
    })
    const service = new DocumentOfflineService({
      cacheStorage: new FakeCacheStorage() as unknown as CacheStorage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    await service.syncMissing([
      '/documents/a.pdf',
      '/documents/broken.pdf',
      '/documents/c.pdf',
    ])

    expect(service.getStatus('/documents/a.pdf')).toBe('cached')
    expect(service.getStatus('/documents/broken.pdf')).toBe('failed')
    expect(service.getStatus('/documents/c.pdf')).toBe('cached')
  })

  it('skips network work for documents already cached in a batch sync', async () => {
    const cacheStorage = new FakeCacheStorage()
    await cacheStorage.cache.put('/documents/a.pdf', okResponse())
    const fetchImpl = vi.fn(async () => okResponse())
    const service = new DocumentOfflineService({
      cacheStorage: cacheStorage as unknown as CacheStorage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    await service.syncMissing(['/documents/a.pdf', '/documents/b.pdf'])

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl).toHaveBeenCalledWith('/documents/b.pdf')
  })

  it('handles Cache Storage write errors gracefully without failing the document', async () => {
    const cacheStorage = new FakeCacheStorage()
    cacheStorage.cache.put = vi.fn(async () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    const fetchImpl = vi.fn(async () => okResponse())
    const service = new DocumentOfflineService({
      cacheStorage: cacheStorage as unknown as CacheStorage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    await expect(
      service.ensureCached('/documents/a.pdf'),
    ).resolves.toBeUndefined()
    expect(service.getStatus('/documents/a.pdf')).toBe('cached')
  })

  it('removes cache entries that are no longer part of the valid registry', async () => {
    const cacheStorage = new FakeCacheStorage()
    await cacheStorage.cache.put(
      'http://localhost/documents/deckplans/old-name.pdf',
      okResponse(),
    )
    await cacheStorage.cache.put(
      'http://localhost/documents/deckplans/still-valid.pdf',
      okResponse(),
    )
    const service = new DocumentOfflineService({
      cacheStorage: cacheStorage as unknown as CacheStorage,
      fetchImpl: vi.fn(),
    })

    await service.removeStale(['/documents/deckplans/still-valid.pdf'])

    const keys = await cacheStorage.cache.keys()
    expect(keys.map((request) => request.url)).toEqual([
      'http://localhost/documents/deckplans/still-valid.pdf',
    ])
  })
})
