import { DOCUMENT_CACHE_NAME } from '../../pwa/documentCache'

export type DocumentStatus = 'not-cached' | 'downloading' | 'cached' | 'failed'

interface DocumentOfflineServiceOptions {
  cacheName?: string
  concurrency?: number
  fetchImpl?: typeof fetch
  cacheStorage?: CacheStorage
}

export class DocumentOfflineService {
  private readonly cacheName: string
  private readonly concurrency: number
  private readonly fetchImpl: typeof fetch
  private readonly cacheStorage: CacheStorage | undefined
  private readonly statuses = new Map<string, DocumentStatus>()
  private readonly inFlight = new Map<string, Promise<void>>()
  private readonly listeners = new Set<() => void>()
  private cachePromise: Promise<Cache | null> | null = null

  constructor(options: DocumentOfflineServiceOptions = {}) {
    this.cacheName = options.cacheName ?? DOCUMENT_CACHE_NAME
    this.concurrency = options.concurrency ?? 2
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch?.bind(globalThis)
    this.cacheStorage =
      options.cacheStorage ??
      (typeof caches !== 'undefined' ? caches : undefined)
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getStatus = (href: string): DocumentStatus =>
    this.statuses.get(href) ?? 'not-cached'

  private setStatus(href: string, status: DocumentStatus): void {
    if (this.statuses.get(href) === status) {
      return
    }
    this.statuses.set(href, status)
    for (const listener of this.listeners) {
      listener()
    }
  }

  private async getCache(): Promise<Cache | null> {
    if (!this.cacheStorage) {
      return null
    }
    this.cachePromise ??= this.cacheStorage
      .open(this.cacheName)
      .catch(() => null)
    return this.cachePromise
  }

  async ensureCached(href: string): Promise<void> {
    const existing = this.inFlight.get(href)
    if (existing) {
      await existing
      return
    }
    const task = this.download(href)
    this.inFlight.set(href, task)
    try {
      await task
    } finally {
      this.inFlight.delete(href)
    }
  }

  private async download(href: string): Promise<void> {
    const cache = await this.getCache()
    if (cache) {
      const existing = await cache.match(href).catch(() => undefined)
      if (existing) {
        this.setStatus(href, 'cached')
        return
      }
    }
    if (!this.fetchImpl) {
      this.setStatus(href, 'failed')
      return
    }
    this.setStatus(href, 'downloading')
    try {
      const response = await this.fetchImpl(href)
      if (!response.ok) {
        throw new Error(`Request for ${href} failed with ${response.status}`)
      }
      if (cache) {
        try {
          await cache.put(href, response.clone())
        } catch {
          // Storage quota or other Cache Storage write errors: the
          // document is still usable for this session; just skip
          // persisting it rather than failing the whole sync.
        }
      }
      this.setStatus(href, 'cached')
    } catch {
      this.setStatus(href, 'failed')
    }
  }

  async syncMissing(hrefs: readonly string[]): Promise<void> {
    const queue = [...new Set(hrefs)]
    const worker = async (): Promise<void> => {
      let next = queue.shift()
      while (next) {
        const href = next
        if (this.getStatus(href) !== 'cached') {
          await this.ensureCached(href)
        }
        next = queue.shift()
      }
    }
    await Promise.all(
      Array.from({ length: this.concurrency }, () => worker()),
    )
  }

  async removeStale(validHrefs: readonly string[]): Promise<void> {
    const cache = await this.getCache()
    if (!cache) {
      return
    }
    const valid = new Set(
      validHrefs.map((href) => new URL(href, 'http://document-cache.local').pathname),
    )
    const keys = await cache.keys()
    await Promise.all(
      keys
        .filter(
          (request) => !valid.has(new URL(request.url).pathname),
        )
        .map((request) => cache.delete(request)),
    )
  }
}

export const documentOfflineService = new DocumentOfflineService()
