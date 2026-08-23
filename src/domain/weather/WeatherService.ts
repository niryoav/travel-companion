import type { WeatherCacheRepository } from '../../storage/WeatherCacheRepository.js'
import { fetchWeatherSnapshot } from './openMeteoClient.js'
import type { WeatherLocation, WeatherResult } from './weatherTypes.js'

// Weather does not need to be re-fetched more often than this; reusing a
// recent cached response avoids unnecessary network requests.
export const WEATHER_STALE_MS = 30 * 60_000

interface WeatherServiceOptions {
  fetchSnapshot?: typeof fetchWeatherSnapshot
  now?: () => number
}

/**
 * Orchestrates fetching live weather with a local cache fallback:
 * - a fresh cached response is reused without a network call;
 * - a successful fetch refreshes the cache;
 * - a failed fetch falls back to any cached response, however old, rather
 *   than replacing valid data with an error state;
 * - with no live data and no cache, it reports unavailable rather than
 *   throwing, so Home/Today never depend on weather being available.
 */
export class WeatherService {
  private readonly fetchSnapshot: typeof fetchWeatherSnapshot
  private readonly now: () => number

  constructor(
    private readonly cache: WeatherCacheRepository,
    options: WeatherServiceOptions = {},
  ) {
    this.fetchSnapshot = options.fetchSnapshot ?? fetchWeatherSnapshot
    this.now = options.now ?? (() => Date.now())
  }

  async getWeather(location: WeatherLocation): Promise<WeatherResult> {
    const cached = this.cache.read(location.id)
    const cacheAgeMs = cached
      ? this.now() - Date.parse(cached.savedAt)
      : Number.POSITIVE_INFINITY

    if (cached && cacheAgeMs < WEATHER_STALE_MS) {
      return { snapshot: cached.snapshot, source: 'cache-fresh' }
    }

    try {
      const snapshot = await this.fetchSnapshot(location)
      this.cache.write(location.id, snapshot)
      return { snapshot, source: 'live' }
    } catch {
      if (cached) {
        return { snapshot: cached.snapshot, source: 'cache-stale' }
      }
      return { snapshot: null, source: 'unavailable' }
    }
  }
}
