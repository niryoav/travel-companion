import { useId } from 'react'

import type { TodayWeatherViewModel } from '../todayTypes'

export function TodayWeatherCard({
  weather,
}: {
  weather: TodayWeatherViewModel
}) {
  const titleId = useId()
  const details = [
    weather.feelsLike,
    weather.wind,
    weather.rainChance,
    weather.seaCondition,
  ].filter((detail): detail is string => Boolean(detail))

  return (
    <section
      className="today-card today-weather"
      aria-labelledby={titleId}
    >
      <p className="today-card-label">Weather · {weather.location}</p>
      <div className="today-weather-summary">
        <div>
          <h2 id={titleId}>{weather.condition}</h2>
          <p className="today-weather-temperature">{weather.temperature}</p>
        </div>
        {details.length ? (
          <ul>
            {details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <p className="today-weather-implication">{weather.implication}</p>
      {weather.outlook?.length ? (
        <ul className="today-weather-outlook">
          {weather.outlook.map((entry) => (
            <li key={`${entry.label}-${entry.time}`}>
              <span className="today-weather-outlook-label">
                {entry.label}
              </span>
              <span className="today-weather-outlook-time">{entry.time}</span>
              <span className="today-weather-outlook-temperature">
                {entry.temperature}
              </span>
              {entry.rainChance ? (
                <span className="today-weather-outlook-rain">
                  {entry.rainChance}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
