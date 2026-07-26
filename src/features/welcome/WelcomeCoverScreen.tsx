import { Link } from 'react-router'

import { daysUntilDeparture, formatDaysToGo } from './countdown'
import { welcomeTrip } from './welcomeTrip'

export function WelcomeCoverScreen() {
  const countdown = formatDaysToGo(
    daysUntilDeparture(welcomeTrip.departureDate),
  )

  return (
    <main className="welcome-cover">
      <img
        className="welcome-hero"
        src={welcomeTrip.heroImage}
        alt=""
        aria-hidden="true"
      />
      <div className="welcome-overlay" aria-hidden="true" />

      <section className="welcome-card" aria-labelledby="welcome-trip-title">
        <p className="welcome-label">Travel Companion</p>
        <p className="welcome-family">{welcomeTrip.family}</p>
        <h1 id="welcome-trip-title">{welcomeTrip.title}</h1>
        <p className="welcome-ship">{welcomeTrip.ship}</p>
        <p className="welcome-dates">{welcomeTrip.dates}</p>
        <p className="welcome-countdown">{countdown}</p>
        <Link className="welcome-enter" to="/home">
          Enter trip
        </Link>
      </section>
    </main>
  )
}
