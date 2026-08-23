import type { WeatherSnapshot } from '../domain/weather/weatherTypes.js'

const WEATHER_CACHE_KEY = 'travel-companion:weather-cache'
const MAX_CACHED_LOCATIONS = 5

interface CachedEntry {
  snapshot: WeatherSnapshot
  savedAt: string
}

interface StoredWeatherCache {
  schemaVersion: 1
  entries: Record<string, CachedEntry>
}

function isCachedEntry(value: unknown): value is CachedEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    'snapshot' in value &&
    'savedAt' in value &&
    typeof (value as { savedAt: unknown }).savedAt === 'string'
  )
}

function parseStoredCache(value: string | null): StoredWeatherCache | null {
  if (!value) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(value)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('schemaVersion' in parsed) ||
      (parsed as { schemaVersion: unknown }).schemaVersion !== 1 ||
      !('entries' in parsed) ||
      typeof (parsed as { entries: unknown }).entries !== 'object'
    ) {
      return null
    }
    const entries = (parsed as { entries: Record<string, unknown> }).entries
    const validEntries: Record<string, CachedEntry> = {}
    for (const [locationId, entry] of Object.entries(entries)) {
      if (isCachedEntry(entry)) {
        validEntries[locationId] = entry
      }
    }
    return { schemaVersion: 1, entries: validEntries }
  } catch {
    return null
  }
}

/**
 * Local cache of the last successful weather response per location, used to
 * keep Home and Today useful when a live forecast can't be fetched.
 */
export class WeatherCacheRepository {
  private readonly now: () => number

  constructor(
    private readonly storage: Storage,
    now: () => number = () => Date.now(),
  ) {
    this.now = now
  }

  read(locationId: string): CachedEntry | null {
    try {
      const stored = parseStoredCache(this.storage.getItem(WEATHER_CACHE_KEY))
      return stored?.entries[locationId] ?? null
    } catch {
      return null
    }
  }

  write(locationId: string, snapshot: WeatherSnapshot): void {
    try {
      const stored = parseStoredCache(
        this.storage.getItem(WEATHER_CACHE_KEY),
      ) ?? { schemaVersion: 1, entries: {} }
      const entries = {
        ...stored.entries,
        [locationId]: {
          snapshot,
          savedAt: new Date(this.now()).toISOString(),
        },
      }
      const pruned = Object.fromEntries(
        Object.entries(entries)
          .sort(
            ([, left], [, right]) =>
              Date.parse(right.savedAt) - Date.parse(left.savedAt),
          )
          .slice(0, MAX_CACHED_LOCATIONS),
      )
      this.storage.setItem(
        WEATHER_CACHE_KEY,
        JSON.stringify({ schemaVersion: 1, entries: pruned }),
      )
    } catch {
      // The cache is a best-effort convenience; failures are non-fatal.
    }
  }
}
