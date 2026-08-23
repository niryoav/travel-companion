import { useEffect, useRef, useState } from 'react'

import { WeatherService } from '../../domain/weather/WeatherService.js'
import type {
  WeatherLocation,
  WeatherResult,
} from '../../domain/weather/weatherTypes.js'
import { WeatherCacheRepository } from '../../storage/WeatherCacheRepository.js'
import { TripSyncRefreshController } from '../../sync/TripSyncRefreshController.js'

const EMPTY_RESULT: WeatherResult = { snapshot: null, source: 'unavailable' }

let sharedService: WeatherService | null = null

function getSharedWeatherService(): WeatherService {
  if (!sharedService) {
    sharedService = new WeatherService(
      new WeatherCacheRepository(window.localStorage),
    )
  }
  return sharedService
}

/**
 * Fetches (and caches) weather for a trip-day location. Home and Today both
 * call this hook so they share the same fetch/cache behaviour; refresh
 * happens on mount, on window focus/visibility, and when connectivity
 * returns (via the same throttled controller used for trip sync).
 *
 * `location` may be a fresh object on every render (callers are not
 * required to memoize it); the fetch is only re-triggered when its `id`
 * actually changes.
 */
export function useTripWeather(
  location: WeatherLocation | null,
  service: WeatherService = getSharedWeatherService(),
): WeatherResult {
  const [result, setResult] = useState<WeatherResult>(EMPTY_RESULT)

  // Kept in sync every render (in an effect, not during render) so the
  // fetch effect below can read the latest location/service without
  // needing their object identity in its dependency array.
  const latestRef = useRef({ location, service })
  useEffect(() => {
    latestRef.current = { location, service }
  })

  useEffect(() => {
    const { location: currentLocation, service: currentService } =
      latestRef.current
    if (!currentLocation) {
      return
    }

    let active = true
    const refresh = () =>
      currentService.getWeather(currentLocation).then((next) => {
        if (active) {
          setResult(next)
        }
      })

    void refresh()

    const controller = new TripSyncRefreshController({
      synchronize: refresh,
    })
    controller.start()

    return () => {
      active = false
      controller.dispose()
    }
  }, [location?.id])

  return location ? result : EMPTY_RESULT
}
