import type {
  HomeContext,
  TravelerProfile,
  CruiseProgress as CruiseProgressModel,
} from '../homeTypes'
import { CruiseProgress } from './CruiseProgress'

interface HomeHeroProps {
  context: HomeContext
  cruiseProgress?: CruiseProgressModel
  greeting: string
  onTravelerChange: (traveler: TravelerProfile) => void
  traveler: TravelerProfile
}

export function HomeHero({
  context,
  cruiseProgress,
  greeting,
  onTravelerChange,
  traveler,
}: HomeHeroProps) {
  return (
    <header className="home-hero">
      <div className="home-greeting-row">
        <div>
          <p className="home-eyebrow">Home</p>
          <h1>{greeting}</h1>
        </div>
        <label className="traveler-control">
          <span>Traveler</span>
          <select
            aria-label="Traveler profile"
            value={traveler}
            onChange={(event) =>
              onTravelerChange(event.target.value as TravelerProfile)
            }
          >
            <option value="Yoav">Yoav</option>
            <option value="Isabel">Isabel</option>
          </select>
        </label>
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
