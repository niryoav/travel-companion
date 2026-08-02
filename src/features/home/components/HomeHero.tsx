import { PortAccessIndicator } from '../../../components/PortAccessIndicator'
import type { PortAccessStatus } from '../../../domain/trip/tripTypes'
import type { HomeContext } from '../homeTypes'

interface HomeHeroProps {
  context: HomeContext
  greeting: string
  intro?: string
  portAccessStatus?: PortAccessStatus
}

export function HomeHero({
  context,
  greeting,
  intro,
  portAccessStatus,
}: HomeHeroProps) {
  return (
    <header className="home-hero">
      <div className="home-greeting">
        <p className="home-eyebrow">Home</p>
        <h1>{greeting}</h1>
        {intro ? <p className="home-intro">{intro}</p> : null}
      </div>

      <div className="home-context">
        <p className="home-card-label">{context.eyebrow}</p>
        <h2>{context.title}</h2>
        <p className="home-context-summary">{context.summary}</p>
        {portAccessStatus ? (
          <PortAccessIndicator status={portAccessStatus} />
        ) : null}
        {context.tripDates ? (
          <p className="home-context-dates">{context.tripDates}</p>
        ) : null}
        {context.countdown ? (
          <p className="home-context-countdown">{context.countdown}</p>
        ) : null}
      </div>
    </header>
  )
}
