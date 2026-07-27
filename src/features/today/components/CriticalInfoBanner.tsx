import type { TodayCriticalInfoViewModel } from '../todayTypes'

interface CriticalInfoBannerProps {
  information: TodayCriticalInfoViewModel
}

export function CriticalInfoBanner({
  information,
}: CriticalInfoBannerProps) {
  return (
    <section
      className="today-critical"
      aria-labelledby="today-critical-title"
    >
      <div className="today-critical-marker" aria-hidden="true">
        !
      </div>
      <div>
        <p className="today-card-label">{information.label}</p>
        <div className="today-critical-heading">
          <h2 id="today-critical-title">{information.title}</h2>
          {information.time ? (
            <time dateTime={information.dateTime}>{information.time}</time>
          ) : null}
        </div>
        {information.detail ? <p>{information.detail}</p> : null}
      </div>
    </section>
  )
}
