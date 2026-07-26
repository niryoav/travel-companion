import type {
  HomeContext,
  CruiseProgress as CruiseProgressModel,
} from '../homeTypes'
import { CruiseProgress } from './CruiseProgress'

interface HomeHeroProps {
  context: HomeContext
  cruiseProgress?: CruiseProgressModel
  greeting: string
}

export function HomeHero({
  context,
  cruiseProgress,
  greeting,
}: HomeHeroProps) {
  return (
    <header className="home-hero">
      <div className="home-greeting">
        <p className="home-eyebrow">Home</p>
        <h1>{greeting}</h1>
      </div>

      <div className="home-context">
        <p className="home-card-label">{context.eyebrow}</p>
        <h2>{context.title}</h2>
        <p className="home-context-summary">{context.summary}</p>
        {context.tripDates ? (
          <p className="home-context-dates">{context.tripDates}</p>
        ) : null}
        {cruiseProgress ? <CruiseProgress progress={cruiseProgress} /> : null}
        {context.countdown ? (
          <p className="home-context-countdown">{context.countdown}</p>
        ) : null}
      </div>
    </header>
  )
}
