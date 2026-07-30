import { AppIcon } from '../../../components/AppIcon'
import type { QuickWeather } from '../homeTypes'

interface QuickWeatherCardProps {
  weather: QuickWeather
}

export function QuickWeatherCard({
  weather,
}: QuickWeatherCardProps) {
  const details = [weather.wind, weather.rain, weather.seaCondition].filter(
    Boolean,
  )

  return (
    <section className="home-card weather-card" aria-labelledby="weather-title">
      <p className="home-card-label">Quick weather · {weather.location}</p>
      <div className="weather-summary">
        <span
          className="weather-symbol"
          data-icon={weather.icon}
          aria-hidden="true"
        >
          <AppIcon name={weather.icon} />
        </span>
        <div>
          <h2 id="weather-title">{weather.temperature}</h2>
          <p>{weather.condition}</p>
        </div>
      </div>
      {details.length ? (
        <ul className="weather-details">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
      <p className="weather-implication">{weather.implication}</p>
    </section>
  )
}
