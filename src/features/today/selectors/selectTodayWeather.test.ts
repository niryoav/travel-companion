import { describe, expect, it } from 'vitest'

import { tripFixture } from '../../../test/fixtures/tripFixture.js'
import type { TripDay } from '../../../domain/trip/tripTypes.js'
import type {
  WeatherLocation,
  WeatherResult,
  WeatherSnapshot,
} from '../../../domain/weather/weatherTypes.js'
import { selectTodayWeather } from './selectTodayWeather.js'

function dayById(id: string): TripDay {
  return tripFixture.days.find((day) => day.id === id)!
}

const primaryLocation: WeatherLocation = {
  id: 'location-harbor-terminal',
  name: 'Harbor Terminal',
  latitude: 51.05,
  longitude: 3.72,
  timeZone: 'Europe/Brussels',
}

function snapshotWithHourly(
  hourlyAt: string,
  hourlyTemperature: number,
  currentAt = '2030-05-11T07:00:00Z',
): WeatherSnapshot {
  return {
    fetchedAt: currentAt,
    current: {
      at: currentAt,
      temperature: 12,
      apparentTemperature: 10,
      precipitationMm: 0,
      windSpeedKmh: 15,
      weatherCode: 2,
    },
    hourly: [
      {
        at: hourlyAt,
        temperature: hourlyTemperature,
        apparentTemperature: hourlyTemperature - 1,
        precipitationProbability: 30,
        windSpeedKmh: 18,
        weatherCode: 61,
      },
    ],
  }
}

describe('selectTodayWeather', () => {
  const day = dayById('day-2030-05-11')
  const portCall = tripFixture.portCalls.find(
    ({ id }) => id === 'port-call-harbor-city',
  )!
  const now = new Date('2030-05-11T07:05:00Z')

  it('returns nothing when there is no location selection', () => {
    expect(
      selectTodayWeather(
        tripFixture,
        day,
        portCall,
        null,
        { snapshot: null, source: 'unavailable' },
        null,
        now,
      ),
    ).toEqual({})
  })

  it('builds the primary weather card', () => {
    const primaryWeather: WeatherResult = {
      snapshot: snapshotWithHourly('2030-05-11T07:30:00Z', 15),
      source: 'live',
    }

    const { weather } = selectTodayWeather(
      tripFixture,
      day,
      portCall,
      { primary: primaryLocation },
      primaryWeather,
      null,
      now,
    )

    expect(weather).toMatchObject({
      location: 'Harbor Terminal',
      temperature: '12°C',
      feelsLike: 'Feels like 10°C',
    })
  })

  it('matches the outlook moment using the trip-day time zone, not device time', () => {
    // event-excursion starts at 09:30 local (Europe/Brussels, +02:00), which
    // is 07:30 UTC. The matching hourly point is provided at that UTC
    // instant (well away from the "current" reading) to prove the correct
    // point is selected across the offset.
    const primaryWeather: WeatherResult = {
      snapshot: snapshotWithHourly(
        '2030-05-11T07:30:00Z',
        15,
        '2030-05-11T02:00:00Z',
      ),
      source: 'live',
    }

    // The fixture port call also has an All Aboard time; drop it here so
    // this test can focus on a single outlook moment.
    const dataWithoutAllAboard = structuredClone(tripFixture)
    const portCallWithoutAllAboard = dataWithoutAllAboard.portCalls.find(
      ({ id }) => id === 'port-call-harbor-city',
    )!
    portCallWithoutAllAboard.allAboardAt = undefined

    const { weather } = selectTodayWeather(
      dataWithoutAllAboard,
      day,
      portCallWithoutAllAboard,
      { primary: primaryLocation },
      primaryWeather,
      null,
      now,
    )

    expect(weather?.outlook).toEqual([
      {
        label: 'Coastal walk starts',
        time: '09:30',
        temperature: '15°C',
        rainChance: 'Rain chance 30%',
      },
    ])
  })

  it('adds a compact secondary location when one is provided with its own weather', () => {
    const secondaryLocation: WeatherLocation = {
      id: 'location-cliff-walk',
      name: 'Cliff Walk',
      latitude: 51.1,
      longitude: 3.9,
      timeZone: 'Europe/Brussels',
    }
    const primaryWeather: WeatherResult = {
      snapshot: snapshotWithHourly('2030-05-11T07:30:00Z', 15),
      source: 'live',
    }
    const secondaryWeather: WeatherResult = {
      snapshot: snapshotWithHourly('2030-05-11T07:30:00Z', 9),
      source: 'live',
    }

    const { additionalWeather } = selectTodayWeather(
      tripFixture,
      day,
      portCall,
      { primary: primaryLocation, secondary: secondaryLocation },
      primaryWeather,
      secondaryWeather,
      now,
    )

    expect(additionalWeather).toHaveLength(1)
    expect(additionalWeather?.[0]).toMatchObject({
      location: 'Cliff Walk',
      temperature: '12°C',
    })
  })

  it('omits the secondary location when its own weather is unavailable', () => {
    const secondaryLocation: WeatherLocation = {
      id: 'location-cliff-walk',
      name: 'Cliff Walk',
      latitude: 51.1,
      longitude: 3.9,
      timeZone: 'Europe/Brussels',
    }
    const primaryWeather: WeatherResult = {
      snapshot: snapshotWithHourly('2030-05-11T07:30:00Z', 15),
      source: 'live',
    }

    const { additionalWeather } = selectTodayWeather(
      tripFixture,
      day,
      portCall,
      { primary: primaryLocation, secondary: secondaryLocation },
      primaryWeather,
      { snapshot: null, source: 'unavailable' },
      now,
    )

    expect(additionalWeather).toBeUndefined()
  })

  it('returns an undefined primary card when the primary weather is unavailable', () => {
    const { weather } = selectTodayWeather(
      tripFixture,
      day,
      portCall,
      { primary: primaryLocation },
      { snapshot: null, source: 'unavailable' },
      null,
      now,
    )

    expect(weather).toBeUndefined()
  })
})
